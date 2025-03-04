import { CapacitorCalendar, CalendarEvent, CalendarPermissionScope } from "@ebarooni/capacitor-calendar";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";


export async function checkPermissions(): Promise<{ 
  status: 'read' | 'write' | 'all' | 'none';
}> {
    if (!Capacitor.isNativePlatform()) {
        return { status: 'all' };
    }
    const { result: readStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.READ_CALENDAR});
    const { result: writeStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.WRITE_CALENDAR});

    let status = 'none';
    if (readStatus === 'granted' || writeStatus === 'granted') {
        if (readStatus === 'granted' && writeStatus === 'granted') {
            return { status: "all" };
        } else if (readStatus === 'granted') {
            return { status: "read" };
        } else if (writeStatus === 'granted') {
            return { status: "write" };
        }
    }
    return { status: "none" };
}

export const synchronizeEvents = async (userId: string): Promise<{ 
  added: number;
  updated: number;
  error?: string;
}> => {
  try {
    // Only proceed if we're on a native platform
    if (!Capacitor.isNativePlatform()) {
      return { added: 0, updated: 0, error: 'Calendar sync is only available on native platforms' };
    }

    // Check calendar permissions
    const { result: permissionStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.READ_CALENDAR});
    if (permissionStatus !== 'granted') {
      return { added: 0, updated: 0, error: 'Calendar permission not granted' };
    }

    // Get events for the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const tenDaysBeforeNow = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    
    // Fetch native calendar events
    const { result: nativeEvents } = await CapacitorCalendar.listEventsInRange({
      from: tenDaysBeforeNow.getTime(),
      to: thirtyDaysFromNow.getTime()
    });

    // todo get attendees, compare by creationDate value if it exists

    // Fetch existing events from Supabase
    // console.log('fetching existing events');
    // const { data: existingEvents, error: fetchError } = await supabase
    //   .from('calendar_events')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .gte('start_time', now.toISOString())
    //   .lte('start_time', thirtyDaysFromNow.toISOString());

    // if (fetchError) {
    //   throw new Error(`Failed to fetch existing events: ${fetchError.message}`);
    // }

    let added = 0;
    let updated = 0;

    // Process each native event
    // TODO (ari) compare by creationDate if exists, as well at calendar source and title
    for (const nativeEvent of nativeEvents) {
    //   const existingEvent = existingEvents?.find(e => 
    //     e.title === nativeEvent.title
    //   );

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
          event_attendees!left (
            contacts!contact_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('calendar_event_id', nativeEvent.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch existing event: ${error.message}`);
      }

      console.log('found existing event? ', JSON.stringify(existingEvent, null, 2))


      const eventData = {
        user_id: userId,
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
      };

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
        existingEvent.description !== eventData.description
      ) {
        console.log('updating event ', JSON.stringify(eventData, null, 2))
        // Update existing event if there are changes
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) {
          console.error('Failed to update event:', updateError);
          continue;
        }
        updated++;
      }
    }

    return { added, updated };
  } catch (error) {
    console.error('Calendar sync error:', error);
    return {
      added: 0, 
      updated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error during calendar sync'
    };
  }
};
