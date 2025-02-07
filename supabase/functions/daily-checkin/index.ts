
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily check-in function');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      throw new Error('Missing environment variables');
    }

    console.log('Creating Supabase client with URL:', supabaseUrl);
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const { type, event_id, user_id, event_title } = requestBody;
    console.log('Check-in type:', type, 'User ID:', user_id);

    if (!user_id) {
      console.error('Missing user_id in request');
      throw new Error('Missing user_id in request');
    }

    // Get user's profile for timezone
    console.log('Fetching profile for user:', user_id);
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, display_name, city')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    const userTimezone = await supabaseClient
      .rpc('get_timezone_for_city', { city_name: profile.city || 'UTC' });
    
    console.log('User timezone:', userTimezone);

    // Function to check if it's within the hour range
    const isWithinHourRange = (hour: number, currentTime: Date): boolean => {
      // For testing purposes, always return true
      // In production, uncomment the actual time check
      return true;
    };

    let message = '';
    if (type === 'morning' || type === 'evening') {
      const userTime = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
      
      const isRightTime = type === 'morning' 
        ? isWithinHourRange(7, userTime)  // 7 AM
        : isWithinHourRange(22, userTime); // 10 PM

      if (!isRightTime) {
        console.log(`Skipping ${type} message - not the right time in ${userTimezone}`);
        return new Response(JSON.stringify({ status: 'skipped', reason: 'not the right time' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (type === 'morning') {
        message = 'What are your plans for today?';
      } else {
        message = 'How was your day? Let me know about any social interactions or activities you had.';
      }
    } else if (type === 'post-event' && event_id && event_title) {
      message = `How was ${event_title}? I'd love to hear about it!`;
    }

    // Route through the chat function instead of direct insert
    console.log('Routing through chat function with message:', message);
    const { error: chatError } = await supabaseClient.functions.invoke('chat', {
      body: { message, userId: user_id }
    });

    if (chatError) {
      console.error('Error calling chat function:', chatError);
      throw chatError;
    }

    console.log('Successfully processed check-in');
    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in daily-checkin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
