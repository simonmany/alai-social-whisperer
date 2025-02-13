
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Smile, X, Archive } from "lucide-react";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Contact } from "@/types/contacts";

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
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const { toast } = useToast();

  const handleEmojiSelect = (emoji: { native: string }) => {
    setGroupEmoji(emoji.native);
    setIsEmojiPickerOpen(false);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      const memberships = selectedContacts.map(contact => ({
        contact_id: contact.id,
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
      setContactInput("");
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(contactInput.toLowerCase()) &&
    !selectedContacts.some(selected => selected.id === contact.id)
  );

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!isEmojiPickerOpen) {
        onOpenChange(value);
      }
    }}>
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
              <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0 w-auto border-none" 
                  side="right" 
                  align="start" 
                  sideOffset={0}
                  onInteractOutside={(e) => {
                    e.preventDefault();
                  }}
                  style={{ 
                    position: 'relative',
                    zIndex: 9999,
                    pointerEvents: 'auto'
                  }}
                >
                  <div className="relative bg-popover shadow-md">
                    <Picker 
                      data={data} 
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                      onClickOutside={(e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Contacts</Label>
            <div className="relative">
              <Input
                placeholder="Type to search contacts..."
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                className="h-8"
              />
              {contactInput && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[120px] overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="px-2 py-1 hover:bg-accent cursor-pointer flex items-center gap-2 justify-between"
                      onClick={() => {
                        setSelectedContacts([...selectedContacts, contact]);
                        setContactInput("");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{contact.name}</span>
                      </div>
                      {contact.is_archived && (
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.name}</span>
                    {contact.is_archived && (
                      <Archive className="h-3 w-3 text-muted-foreground" />
                    )}
                    <button
                      onClick={() => {
                        setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
