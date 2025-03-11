import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabase.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function matchAttendeesToContacts(userId: string, attendees: any[]): Promise<Array<any>> {
  let contacts: any[] = [];
  for (const attendee of attendees) {
    const { data: findContact, error: findError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .or(
        `name.eq.${attendee.name},email.eq.${attendee.name},email.eq.${attendee.email}`
      )
      .single();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error finding contact:', findError);
        continue;
      }
      if (findContact) contacts.push(findContact);
    if (!findContact) {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .upsert({
          name: attendee.name,
          email: attendee.email,
          user_id: userId
        })
        .select('*')
        .limit(1)
        .single();
        console.log('Creating new contact', newContact);
        contacts.push(newContact);
    }
  }
  return contacts;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { user_id, native_events } = await req.json();
  if (!native_events || !user_id) {
    throw new Error('Missing required argument ', user_id);
  }

  let added = 0;
  let updated = 0;
  try {
    // Process each native event
    // TODO (ari) compare by creationDate if exists, as well at calendar source and title
    for (const nativeEvent of native_events) {

      const { data: existingEvent, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          feedback_sent,
          start_time,
          end_time,
          location,
          all_day,
          event_attendees!left (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', user_id)
        .eq('calendar_event_id', nativeEvent.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch existing event: ${error.message}`);
      }

      console.log('found existing event? ', JSON.stringify(existingEvent, null, 2))

      const now = new Date();


      const eventData = {
        user_id,
        title: nativeEvent.title,
        start_time: new Date(nativeEvent.startDate).toISOString(),
        end_time: new Date(nativeEvent.endDate).toISOString(),
        location: nativeEvent.location,
        description: nativeEvent.description,
        updated_at: now.toISOString(),
        created_at: nativeEvent.creationDate ? new Date(nativeEvent.creationDate).toISOString() : now.toISOString(),
        timezone: nativeEvent.timezone,
        all_day: nativeEvent.isAllDay,
        calendar_event_id: nativeEvent.id,
        feedback_sent: false,
      };

      let attendees = await matchAttendeesToContacts(user_id, nativeEvent.attendees);

      if (!existingEvent) {
        // Insert new event
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(eventData);

        if (insertError) {
          console.error('Failed to insert event:', insertError);
          continue;
        }
        added++;
      } else if (
        existingEvent.start_time !== eventData.start_time ||
        existingEvent.end_time !== eventData.end_time ||
        existingEvent.location !== eventData.location ||
        existingEvent.description !== eventData.description ||
        existingEvent.event_attendees?.length !== attendees?.length
      ) {
        // Update existing event if there are changes
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        // Add all attendees to event_attendees table
        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .upsert(
            attendees.map(attendee => ({
              event_id: existingEvent.id,
              contact_id: attendee.id,
            })),
            { 
              onConflict: 'event_id, contact_id',
              ignoreDuplicates: false
            }
          );

        if (attendeesError) {
          console.error('Failed to update event attendees:', attendeesError);
        }

        if (updateError) {
          console.error('Failed to update event:', updateError);
          continue;
        }
        updated++;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }

  return new Response(
    JSON.stringify({ added, updated, error: '' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
});
