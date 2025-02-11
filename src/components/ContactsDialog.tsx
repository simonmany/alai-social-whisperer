
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Instagram, Linkedin, Twitter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

const ContactsDialog = ({ open, onOpenChange, onSubmit }: ContactsDialogProps) => {
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

    let contactsString = "";
    if (phone) contactsString += `📱 ${phone} `;
    if (instagram) contactsString += `📸 @${instagram} `;
    if (linkedin) contactsString += `💼 ${linkedin} `;
    if (twitter) contactsString += `🐦 @${twitter}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error: contactError } = await supabase
      .from('contacts')
      .insert([{
        user_id: user.id,
        name,
        phone,
        instagram,
        linkedin,
        twitter,
        photo,
        meeting_story: meetingStory,  // Fixed: using the state variable meetingStory
        relationship,
        is_archived: false
      }]);

    if (contactError) {
      console.error('Error creating contact:', contactError);
      return;
    }

    const message = `I met ${name} ${meetingStory ? `at ${meetingStory}` : ""}. ${
      contactsString ? `Their contacts are ${contactsString.trim()}.` : ""
    } They are... ${relationship}`;

    onSubmit(message);
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
