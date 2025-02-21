export interface Contact {
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

export const functions = [
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