import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { user_id, native_contacts } = await req.json();
  if (!native_contacts || !user_id) {
    throw new Error('Missing required argument ', user_id);
  }
  try {
    for (const contact of native_contacts) {
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('id, name, phone, email, address')
        .eq('user_id', user_id)
        .eq('name', contact.name.display)
        .limit(1)
        .maybeSingle();
  
      if (checkError) throw checkError;
  
      if (!existingContact) {
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            user_id: user_id,
            name: contact.name.display,
            phone: contact.phones?.[0]?.number,
            email: contact.emails?.[0]?.address,
            address: contact.postalAddresses?.[0]?.street ? `${contact.postalAddresses?.[0]?.street}, ${contact.postalAddresses?.[0]?.city}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
  
        if (insertError) throw insertError;
      }
      else if (
        existingContact.name !== contact.name.display
        || existingContact.phone !== contact.phones?.[0]?.number
        || existingContact.email !== contact.emails?.[0]?.address
        || existingContact.address !== `${contact.postalAddresses?.[0]?.street}, ${contact.postalAddresses?.[0]?.city}`
      ) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            name: contact.name.display,
            phone: contact.phones?.[0]?.number,
            email: contact.emails?.[0]?.address,
            address: contact.postalAddresses?.[0]?.street ? `${contact.postalAddresses?.[0]?.street}, ${contact.postalAddresses?.[0]?.city}` : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContact.id);
  
        if (updateError) throw updateError;
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
    JSON.stringify({ result: 'success' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    },
  );
});
