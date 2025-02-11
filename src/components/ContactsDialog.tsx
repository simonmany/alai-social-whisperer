
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Instagram, Linkedin, Twitter, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id?: string;
  user_id: string;
  name: string;
  phone: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  photo?: string;
  is_archived: boolean;
  meeting_story: string;
  relationship: string;
  created_at: string;
}
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
      const newContact: Contact = {
        user_id: userId,
        name: name,
        phone: phone,
        instagram: instagram,
        linkedin: linkedin,
        twitter: twitter,
        photo: photo,
        meeting_story: meetingStory,
        relationship: relationship,
        is_archived: false,
        created_at: new Date().toISOString()
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // First, try to fetch all contacts with similar names to avoid duplicates
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('name')
        .ilike('name', `%${name}%`)
        .eq('user_id', user.id);

      // Check if we might be creating a duplicate
      if (existingContacts && existingContacts.some(contact => 
        contact.name.toLowerCase() === name.toLowerCase()
      )) {
        console.log('Found potential duplicate contact:', name);
        // You might want to show a warning to the user here
      }

      // Insert contact into database
      const { data, error } = await supabase
      .from('contacts')
      .insert([newContact])
      .select()
      .single();

      if (error) {
        console.error('Error inserting contact:', error);
        throw new Error(`Error inserting contact: ${error.message}`);
      }

      // Generate message for chat
      let contactsString = "";
      if (phone) contactsString += `📱 ${phone} `;
      if (instagram) contactsString += `📸 @${instagram} `;
      if (linkedin) contactsString += `💼 ${linkedin} `;
      if (twitter) contactsString += `🐦 @${twitter}`;

      const message = `I met ${name} ${meetingStory ? `at ${meetingStory}` : ""}. ${
        contactsString ? `Their contacts are ${contactsString.trim()}.` : ""
      } They are... ${relationship}`;

      onSubmit(message, data);
      onOpenChange(false);
      
      // Reset form
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
      // You might want to show an error message to the user here
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
            <Label htmlFor="name">Name*</Label>
            <div className="flex gap-2">
              <User className="w-4 h-4 mt-3" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone #</Label>
            <div className="flex gap-2">
              <Phone className="w-4 h-4 mt-3" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="flex gap-2">
              <Instagram className="w-4 h-4 mt-3" />
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <div className="flex gap-2">
              <Linkedin className="w-4 h-4 mt-3" />
              <Input
                id="linkedin"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="twitter">Twitter</Label>
            <div className="flex gap-2">
              <Twitter className="w-4 h-4 mt-3" />
              <Input
                id="twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo">Profile Photo URL</Label>
            <Input
              id="photo"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>How'd you meet?</Label>
            <Input
              value={meetingStory}
              onChange={(e) => setMeetingStory(e.target.value)}
              placeholder="Tell us your story..."
            />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Suggestions:</p>
              {meetingSuggestions.map((suggestion) => (
                <p
                  key={suggestion}
                  className="italic cursor-pointer hover:text-foreground"
                  onClick={() => setMeetingStory(suggestion)}
                >
                  • {suggestion}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Who are they?</Label>
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Tell us about them..."
            />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Suggestions:</p>
              {relationshipSuggestions.map((suggestion) => (
                <p
                  key={suggestion}
                  className="italic cursor-pointer hover:text-foreground"
                  onClick={() => setRelationship(suggestion)}
                >
                  • {suggestion}
                </p>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!name}
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactsDialog;

