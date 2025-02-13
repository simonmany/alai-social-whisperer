import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

interface Contact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meeting_story?: string;
  relationship?: string;
  interests?: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing environment variables');
}
const supabase = createClient(
  supabaseUrl ?? '',
  supabaseServiceKey ?? ''
);

const functions = [
  {
    "type": "function",
    "function": {
      "name": "searchGooglePlaces",
      "description": "Searches for places using Google Places API based on a search string and optional location.",
      "strict": true,
      "parameters": {
          "type": "object",
          "required": [
              "searchString",
              "location"
          ],
          "properties": {
              "searchString": {
                  "type": "string",
                  "description": "The search query for the places, such as a name or keyword."
              },
              "location": {
                  "type": "string",
                  "description": "An optional parameter to specify a location context for the search."
              }
          },
          "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
        "name": "findFriendsForActivity",
        "description": "Identifies two friends who are most likely to match a given activity based on the user's contacts.",
        "strict": true,
        "parameters": {
            "type": "object",
            "required": [
                "userId",
                "activity"
            ],
            "properties": {
                "userId": {
                    "type": "string",
                    "description": "The ID of the user for whom to find friends for an activity"
                },
                "activity": {
                    "type": "string",
                    "description": "The activity around which to find matching friends"
                }
            },
            "additionalProperties": false
        }
    }
  }
];


async function callLLM(apiKey: string, messages: any[], tools?: any[]) {
  const requestBody: any = {
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" },
  };

  if (tools) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }
  console.log('Sending request to OpenAI:', { 
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }
  return response;
}

function constructSystemPrompt(profile: any, events: any, contacts: any) {
  // Format events to be more readable
  const formattedEvents = events.map((event: any) => ({
    ...event,
    start_time: new Date(event.start_time).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    end_time: new Date(event.end_time).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }));

  return `You are Al, a friendly and helpful social life assistant. You have access to the following user data:
      - Profile: ${JSON.stringify(profile, null, 2)}
      - Calendar Events for the next 10 days: ${JSON.stringify(formattedEvents, null, 2)}
      
      If asked about the calendar or scheduling, you can:
      - List upcoming events
      - Suggest free time slots for new activities
      - Help identify scheduling conflicts
      - Provide summaries of the user's schedule
      
      When suggesting times for activities:
      1. Check the existing calendar events to avoid conflicts
      2. Suggest specific dates and times that work around existing commitments
      3. Consider typical timing for the suggested activity (e.g., dinner in the evening)

      When users mention meeting someone new or talk about a contact:
      1. Extract the person's name and any contact information shared. This information is stored automatically so you should not offer to store it.
      2. If the user did not share any contact information, ask for at least one contact method (phone, email, instagram, etc.)
      3. If they mention meeting someone new, respond in a way that shows interest in the new connection
      4. Ask follow-up questions about the person if not much information was shared
      5. If the user mentions any foods, recreation activities, or arts/media that the contact likes, add it to the interests list

      When the user talks about multiple contacts together, they are probably part of a group
      1. Give the group a descriptive name
      2. Include the name of each person discussed in the context of the group
      3. Otherwise leave the contact_groups list empty

      When users provide feedback about a social interaction or "hang":
      1. Ask thoughtful follow-up questions about:
         - The quality of the conversation and connection
         - Any interesting topics or shared interests discovered
         - Their comfort level and engagement during the interaction
         - Whether they'd like to plan another hang with these people
      2. Look for patterns in their social preferences
      3. Use their feedback to make better suggestions for future social activities
      4. If they express any concerns or negative experiences, provide empathetic support and constructive suggestions

      Ask these questions one at a time to not overwhelm the user. Keep a natural conversational flow.
      
      Your response should be in this JSON format:
      {
        "text": "your conversational response here",
        contacts: [
          {
            name: string, the contact's name
            email?: string, the contact's email
            phone?: string, the contact's phone number
            instagram?: string, the contact's instagram handle
            linkedin?: string, the contact's linkedin handle
            twitter?: string, the contact's twitter handle
            meeting_story?: string, a brief description of the meeting
            relationship?: string, a brief summary of the relationship
            interests?: array of strings, a list of the contact's interests
          }
        ],
        contact_groups: [
          {
            name: string,
            contacts: [
              {
                name: string
              }
            ]
          }
        ]
      }
      
      Use this context to provide personalized responses. Keep responses concise, friendly, and focused on helping users with their social life, relationships, and personal growth.`;
}

async function findFriendsForActivity(userId: string, activity: string): Promise<string[]> {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error('Failed to fetch contacts');
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `Given the following list of contacts and their interests, identify the 2 friends who are most likely to want to do this activity: ${activity}. Return their contact data JSON array.`;

  const response = await callLLM(openAIApiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(contacts, null, 2) }
  ]);

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return result;
}


async function searchGooglePlaces(searchString: string, location?: string): Promise<any> {
  const apiKey = Deno.env.get('VITE_PUBLIC_GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }
  if (location) {
    searchString += ` in ${location}`;
  }

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchString)}&inputtype=textquery&key=${apiKey}`;
  // TODO (ari) maybe include editorial_summary

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("data", data);
  const placeId = data.candidates[0].place_id;

  const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name%2Curl%2Cformatted_address&key=${apiKey}`;
  const placeResponse = await fetch(placeUrl, {
    method: 'GET',
  });

  if (!placeResponse.ok) {
    throw new Error(`Google Places API error: ${placeResponse.statusText}`);
  }

  const placeData = await placeResponse.json();
  console.log("placeData", placeData);
  return placeData.result;
}

async function extractNamesFromText(text: string): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a name extraction tool. Extract ONLY the names of people mentioned in the text. Return them as a JSON object with a single "names" array containing the extracted names as strings. Only include actual names, not pronouns or generic terms like "friend" or "sister". Return an empty array if no names are found. Example response format: {"names": ["John Smith", "Mary Johnson"]}'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1 // Low temperature for more consistent results
    }),
  });

  if (!response.ok) {
    console.error('Error calling OpenAI:', await response.text());
    return [];
  }
  
  try {
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log('Extracted names:', result.names);
    return result.names || [];
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return [];
  }
}


async function searchContactsByNames(userId: string, names: string[]) {
  let mentionedContacts = [];
  if (names.length > 0) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, email, phone, instagram, linkedin, twitter, meeting_story, relationship')
      .eq('user_id', userId);
    if (error) {
      console.error('Error searching contacts:', error);
      throw new Error(`Error searching contacts: ${error.message}`);
    }

    const filteredContacts = data.filter(contact => names.some(name => contact.name.toLowerCase().includes(name.toLowerCase())));
    
    mentionedContacts = filteredContacts.map(contact => Object.fromEntries(
      Object.entries(contact).filter(([_, value]) => value !== null)
    ));
  }
  console.log('Found contacts', mentionedContacts)

  return mentionedContacts;
}

async function upsertContacts(userId: string, contacts: Contact[]) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(contacts.map(contact => ({
      ...contact,
      user_id: userId,
    })));

  if (error) {
    console.error('Error upserting contacts:', error);
    throw new Error(`Error upserting contacts: ${error.message}`);
  }

  return data;
}

async function upsertContactGroup(userId: string, group: { 
  id?: string;
  name: string;
  emoji?: string;
}) {
  const groupData = {
    user_id: userId,
    name: group.name,
    emoji: group.emoji,
    ...(group.id && { id: group.id }),
  };

  const { data, error } = await supabase
    .from('contact_groups')
    .upsert(groupData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsertContactGroupMemberships(
  groupId: string,
  contactIds: string[]
) {

  // Then insert new memberships
  const memberships = contactIds.map(contactId => ({
    group_id: groupId,
    contact_id: contactId,
  }));

  const { data, error } = await supabase
    .from('contact_group_memberships')
    .insert(memberships)
    .select();

  if (error) {
    console.log("Error inserting into contact groups", error)
  };
  return data;
}

async function mergeContacts(existingContacts: Contact[], newContacts: Contact[]) {
  // Handle multiple contacts
  for (const contact of newContacts) {
    const matchingContact = existingContacts.find(mc => mc.name.toLowerCase().includes(contact.name.toLowerCase()));
    if (matchingContact) {
      if (contact.relationship) {
        matchingContact.relationship = [matchingContact.relationship, contact.relationship].filter(Boolean).join(', ');
      }
      if (contact.email) {
        matchingContact.email = contact.email;
      }
      if (contact.phone) {
        matchingContact.phone = contact.phone;
      }
      if (contact.instagram) {
        matchingContact.instagram = contact.instagram;
      }
      if (contact.linkedin) {
        matchingContact.linkedin = contact.linkedin;
      }
      if (contact.twitter) {
        matchingContact.twitter = contact.twitter;
      }
      if (contact.meeting_story) {
        matchingContact.meeting_story = contact.meeting_story;
      }
      if (contact.interests) {
        matchingContact.interests = Array.from(new Set([
          ...(matchingContact.interests || []),
          ...(contact.interests || [])
        ]));
      }
    }
  }
  console.log('merged contacts', existingContacts);
  
  // Update the contacts in the database
  return existingContacts;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { message, userId, contactInfo } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      console.error('Missing openai api key');
      throw new Error('Server configuration error');
    }

    console.log('Processing chat request:', { userId, contactInfo });

    // Store user message
    const { error: userMessageError } = await supabase
    .from('chat_history')
    .insert([
      { user_id: userId, message, is_ai: false }
    ]);

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
      throw userMessageError;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    const profileData = {
      username: profile.username,
      goals: profile.goals,
      personality_comments: profile.personality_comments,
      current_interests: profile.current_interests,
      desired_interests: profile.desired_interests,
      age: profile.age,
      city: profile.city,
      languages: profile.languages,
      relationship_status: profile.relationship_status,
      gender: profile.gender,
      occupation: profile.occupation,
    };

    const now = new Date();
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(now.getDate() + 10);

    // Get user's UTC offset
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('utc_offset_minutes')
      .eq('id', userId)
      .single();
    
    const utcOffsetMinutes = userProfile?.utc_offset_minutes || -240;

    // Function to convert UTC time to local time
    const convertToLocalTime = (utcTime: string) => {
      const date = new Date(utcTime);
      const localDate = new Date(date.getTime() - (utcOffsetMinutes * 60 * 1000));
      return localDate.toISOString();
    };

    // Get events and convert times to local timezone
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', tenDaysFromNow.toISOString())
      .order('start_time', { ascending: true });

    // Convert event times to local timezone
    const localEvents = events?.map(event => ({
      ...event,
      start_time: convertToLocalTime(event.start_time),
      end_time: convertToLocalTime(event.end_time)
    })) || [];

    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Extract names from the message and get their contact info
    let mentionedContacts = contactInfo ? [contactInfo] : [];
    if (!contactInfo) {
      const names = await extractNamesFromText(message);
      if (names.length > 0) { 
        mentionedContacts = await searchContactsByNames(userId, names);
        if (mentionedContacts.length === 0) {
          await upsertContacts(userId, names.map(name => ({name})));
          console.log('Upserting new contacts ', names);
          mentionedContacts = await searchContactsByNames(userId, names);
        }
        else if (names.some(name => !mentionedContacts.some(mc => mc.name.toLowerCase() === name.toLowerCase()))) {
          const newNames = names.filter(name => !mentionedContacts.some(mc => mc.name.toLowerCase().includes(name.toLowerCase())));
          console.log('Creating new contacts for:', newNames);
          await upsertContacts(userId, newNames.map(name => ({ name })));
          mentionedContacts = await searchContactsByNames(userId, names);
        }
      }
      console.log("mentioned contacts",mentionedContacts)
    }

    const messages = chatHistory?.map(msg => ({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message
    })) || [];

    let contactContext = '';
    if (mentionedContacts.length > 0) {
      contactContext = `The people we are talking about:\n${JSON.stringify(mentionedContacts.map(contact => {
        const { id, ...contactWithoutId } = contact;
        return contactWithoutId;
      }), null, 2)}\n`;
      console.log('Inserting contextual contact data ', contactContext)
    }

    messages.push({
      role: 'user',
      content: contactContext + message
    });

    const systemPrompt = constructSystemPrompt(profileData, localEvents, mentionedContacts);
    messages.unshift({
      role: 'system',
      content: systemPrompt
    });

    let response = await callLLM(openAIApiKey, messages, functions);
    let responseData = await response.json();
    let aiResponse = responseData.choices[0].message.content;

    let parsedResponse;
    if (responseData.choices[0].message.tool_calls) {
      for (const toolCall of responseData.choices[0].message.tool_calls) {
        console.log(toolCall);
        
        if (toolCall.function.name === 'searchGooglePlaces') {
          const args = JSON.parse(toolCall.function.arguments);
          try {
            if (!args.location) {
              args.location = profile.city;
            }
            const placeResult = await searchGooglePlaces(args.searchString, args.location);
            
            // Send the place result back to GPT for a natural response
            messages.push(responseData.choices[0].message);
            messages.push(
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(placeResult) }
            );
          } catch (error) {
            console.error('Error calling Google Places API:', error);
            messages.push(
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ error: 'Failed to search places' }) }
            );
          }
        }
        if (toolCall.function.name === 'findFriendsForActivity') {
          const args = JSON.parse(toolCall.function.arguments);
          const friends = await findFriendsForActivity(userId, args.activity);
          messages.push(responseData.choices[0].message);
          messages.push(
            { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(friends, null, 2) }
          );
        }
      }
      
      // After processing all tool calls, get the final response
      const finalResponse = await callLLM(openAIApiKey, [{ role: 'system', content: systemPrompt }, ...messages]);
      const finalData = await finalResponse.json();
      parsedResponse = JSON.parse(finalData.choices[0].message.content);
    } else {
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        parsedResponse = {
          text: "I'm sorry, I had an internal error. Can you file a bug report?",
          contacts: [],
        };
      }
    }
    console.log('parsed response', parsedResponse)

    let contacts = mentionedContacts;
    if (parsedResponse.contacts && Array.isArray(parsedResponse.contacts) && parsedResponse.contacts.length > 0) {
      contacts = await mergeContacts(mentionedContacts, parsedResponse.contacts);
      await upsertContacts(userId, contacts);
    }

    if (parsedResponse.contact_groups && parsedResponse.contact_groups.length > 0) {
      for (const group of parsedResponse.contact_groups) {
        let groupId: string;
        const existingGroup = await supabase
          .from('contact_groups')
          .select('id')
          .eq('user_id', userId)
          .eq('name', group.name)
          .single();

        if (existingGroup.data) {
          groupId = existingGroup.data.id;
        } else {
          const newGroup = await upsertContactGroup(userId, { name: group.name });
          groupId = newGroup.id;
        }

        const contactIds = contacts.map(contact => contact.id).filter(Boolean) as string[];
        console.log('upserting contacts', contactIds)
        await upsertContactGroupMemberships(groupId, contactIds);
      }
    }

    const { error: aiMessageError } = await supabase
      .from('chat_history')
      .insert([
        { user_id: userId, message: parsedResponse.text, is_ai: true }
      ]);

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    return new Response(JSON.stringify({ 
      response: parsedResponse.text,
      contacts: contacts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
