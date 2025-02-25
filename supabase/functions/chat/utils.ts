import { Contact } from "./types.ts";
import { supabase } from '../_shared/supabase.ts';
import { filterJSON } from "../_shared/utils.ts";

export async function searchGooglePlaces(searchString: string, location?: string): Promise<any> {
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

export async function extractNamesFromText(text: string): Promise<string[]> {
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


export async function searchContactsByNames(userId: string, names: string[]) {
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
    
    mentionedContacts = filterJSON(filteredContacts);
  }
  console.log('Found contacts', mentionedContacts)

  return mentionedContacts;
}

export async function upsertContacts(userId: string, contacts: Contact[]) {
  if (contacts.length === 0) {
    return [];
  }
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

export async function upsertContactGroup(userId: string, group: { 
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

export async function upsertContactGroupMemberships(
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

export async function mergeContacts(existingContacts: Contact[], newContacts: Contact[]) {
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

export async function upsertContactGroups(userId: string, contactGroups: any[], contacts: Contact[]) {
  for (const group of contactGroups) {
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

export async function findFriendsForActivity(userId: string, activity: string): Promise<string[]> {
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
