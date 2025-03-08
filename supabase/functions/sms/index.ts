import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabase } from '../_shared/supabase.ts';

const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

if (!accountSid || !authToken || !fromNumber) {
  throw new Error('Missing required environment variables');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { user_id, message } = await req.json();
  if (!message || !user_id) {
    throw new Error('Missing required argument ', user_id);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('id', user_id)
    .single();

  if (error) {
    console.error('Error finding user phone number:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }

  let phoneNumber = data.phone_number;

  if (!phoneNumber) {
    return new Response(
      JSON.stringify({ error: 'User has no phone number on file' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }

  // Use regex to check that phoneNumber starts with a +, if it does not, append +1
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = `+1${phoneNumber}`;
  }

  let splitMessage = message.split(" ");
  let idx = 0;
  let shortenedMessage = "";
  while (shortenedMessage.length + splitMessage[idx].length + 6 <= 160) {
    shortenedMessage += splitMessage[idx] + " ";
    idx++;
  }
  shortenedMessage += "...";
  console.log("shortenedMessage", shortenedMessage);

  try {
    // Using fetch to make a curl-like request to Twilio API
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Create Basic Auth credentials
    const credentials = btoa(`${accountSid}:${authToken}`);
    
    const response = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'To': phoneNumber,
        'From': fromNumber,
        'Body': shortenedMessage,
      }).toString(),
    });
    
    const result = await response.json();
    console.log('result', result);
    
    if (!response.ok) {
      console.error('Error sending SMS:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: result }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }
    
    console.log('SMS sent successfully:', result.sid);
    
    return new Response(
      JSON.stringify({ result: 'success', sid: result.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Exception when sending SMS:', error);
    return new Response(
      JSON.stringify({ error: 'Exception when sending SMS', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});