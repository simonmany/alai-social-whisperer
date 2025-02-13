
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Smile } from "lucide-react";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Contact {
  id: string;
  name: string;
}

interface GroupManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onGroupCreated: () => void;
}

const GroupManagementDialog = ({ 
  open, 
  onOpenChange, 
  contacts,
  onGroupCreated 
}: GroupManagementDialogProps) => {
  const [groupName, setGroupName] = useState("");
  const [groupEmoji, setGroupEmoji] = useState("👥");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!groupName || selectedContacts.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a group name and select at least one contact",
        variant: "destructive",
      });
      return;
    }

    // Prevent creating groups with reserved names
    if (groupName.toLowerCase() === "home" || groupName.toLowerCase() === "inner orbit") {
      toast({
        title: "Error",
        description: "This group name is reserved. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('contact_groups')
        .insert({
          name: groupName,
          user_id: user.id,
          emoji: groupEmoji,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add selected contacts to the group
      const memberships = selectedContacts.map(contactId => ({
        contact_id: contactId,
        group_id: groupData.id,
      }));

      const { error: membershipError } = await supabase
        .from('contact_group_memberships')
        .insert(memberships);

      if (membershipError) throw membershipError;

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      onGroupCreated();
      onOpenChange(false);
      setGroupName("");
      setGroupEmoji("👥");
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emoji">Group Emoji</Label>
            <div className="flex gap-2">
              <Input
                id="emoji"
                value={groupEmoji}
                onChange={(e) => setGroupEmoji(e.target.value)}
                placeholder="Enter emoji..."
                className="flex-1"
                readOnly
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto border-none" side="right" align="start">
                  <Picker 
                    data={data} 
                    onSelect={(emoji: { native: string }) => {
                      setGroupEmoji(emoji.native);
                    }}
                    theme="dark"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Select Contacts</Label>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id={contact.id}
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={(checked) => {
                      setSelectedContacts(prev =>
                        checked
                          ? [...prev, contact.id]
                          : prev.filter(id => id !== contact.id)
                      );
                    }}
                  />
                  <label
                    htmlFor={contact.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {contact.name}
                  </label>
                </div>
              ))}
            </ScrollArea>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!groupName || selectedContacts.length === 0}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupManagementDialog;
