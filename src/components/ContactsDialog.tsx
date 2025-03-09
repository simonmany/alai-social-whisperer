
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Instagram, Linkedin, Twitter, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";

interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string, contact: Contact) => void;
  userId: string;
}

const ContactsDialog = ({ open, onOpenChange, onSubmit, userId }: ContactsDialogProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [photo, setPhoto] = useState("");
  const [meetingStory, setMeetingStory] = useState("");
  const [relationship, setRelationship] = useState("");

  const meetingSuggestions = [
    "at a dinner hosted by Eric",
    "at Paddy's pub",
    "at the Smash Mouth concert"
  ];

  const relationshipSuggestions = [
    "a fellow investor",
    "a golf friend",
    "a date"
  ];

  const handleSubmit = async () => {
    if (!name) return;

    try {
      const newContact: Omit<Contact, 'id'> = {
        user_id: userId,
        name: name,
        phone: phone,
        instagram: instagram,
        linkedin: linkedin,
        twitter: twitter,
        meeting_story: meetingStory,
        relationship: relationship,
        is_archived: false,
        created_at: new Date().toISOString(),
        interests: [] // Initialize with empty array
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('name')
        .ilike('name', `%${name}%`)
        .eq('user_id', user.id);

      if (existingContacts && existingContacts.some(contact => 
        contact.name.toLowerCase() === name.toLowerCase()
      )) {
        console.log('Found potential duplicate contact:', name);
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert([newContact])
        .select()
        .single();

      if (error) {
        console.error('Error inserting contact:', error);
        throw new Error(`Error inserting contact: ${error.message}`);
      }

      let contactsString = "";
      if (phone) contactsString += `📱 ${phone} `;
      if (instagram) contactsString += `📸 @${instagram} `;
      if (linkedin) contactsString += `💼 ${linkedin} `;
      if (twitter) contactsString += `🐦 @${twitter}`;

      const message = `I met ${name} ${meetingStory ? `at ${meetingStory}` : ""}. ${
        contactsString ? `Their contacts are ${contactsString.trim()}.` : ""
      } They are... ${relationship}`;

      if (data) {
        const processedData: Contact = {
          ...data,
          interests: Array.isArray(data.interests) 
            ? data.interests.map(i => String(i)) // Convert each interest to string
            : []
        };
        onSubmit(message, processedData);
      }

      onOpenChange(false);
      
      // Reset form fields
      setName("");
      setPhone("");
      setInstagram("");
      setLinkedin("");
      setTwitter("");
      setPhoto("");
      setMeetingStory("");
      setRelationship("");
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Who's your new friend?</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter their name..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter their phone number..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Enter their Instagram handle..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="Enter their LinkedIn profile..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="Enter their Twitter handle..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meetingStory">How did you meet?</Label>
            <Input
              id="meetingStory"
              value={meetingStory}
              onChange={(e) => setMeetingStory(e.target.value)}
              placeholder="Tell me how you met..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="What's your relationship?"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Add Contact
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactsDialog;
