
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

const PlanningDialog = ({ open, onOpenChange, onSubmit }: PlanningDialogProps) => {
  const [activity, setActivity] = useState("");
  const [time, setTime] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as Contact[];
    }
  });

  const filteredContacts = contacts?.filter(contact => 
    !selectedContacts.some(selected => selected.id === contact.id) &&
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const removeContact = (contactToRemove: Contact) => {
    setSelectedContacts(selectedContacts.filter(c => c.id !== contactToRemove.id));
  };

  const generateMessage = () => {
    const hasActivity = activity.trim() !== "";
    const hasContacts = selectedContacts.length > 0;
    const hasTime = time.trim() !== "";

    // All fields blank
    if (!hasActivity && !hasContacts && !hasTime) {
      return "Find me something to do!";
    }

    // Only one field filled
    if (hasActivity && !hasContacts && !hasTime) {
      return `I want to ${activity}. Find me some people and a time!`;
    }
    if (!hasActivity && hasContacts && !hasTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      return `I want to hang with ${contactNames}. Find us an activity and a time!`;
    }
    if (!hasActivity && !hasContacts && hasTime) {
      return `Find me a hang at ${time}`;
    }

    // Two fields filled
    if (hasActivity && hasContacts && !hasTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      return `Find me a time to ${activity} with ${contactNames}!`;
    }
    if (hasActivity && !hasContacts && hasTime) {
      return `Find me someone to ${activity} with at ${time}!`;
    }
    if (!hasActivity && hasContacts && hasTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      return `Find me something to do with ${contactNames} at ${time}!`;
    }

    // All fields filled
    const contactNames = selectedContacts.map(c => c.name).join(", ");
    return `I want to ${activity} with ${contactNames} at ${time}`;
  };

  const handleSubmit = () => {
    const message = generateMessage();
    onSubmit(message);
    setActivity("");
    setSelectedContacts([]);
    setTime("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Plan a Hang</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">I want to...</label>
            <Input
              placeholder="Enter an activity (optional)"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">with...</label>
            <Popover open={commandOpen} onOpenChange={setCommandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={commandOpen}
                  className="justify-between w-full"
                >
                  <span className="text-muted-foreground">
                    {selectedContacts.length > 0 
                      ? `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} selected`
                      : "Select contacts..."
                    }
                  </span>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search contacts..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {filteredContacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => {
                          setSelectedContacts([...selectedContacts, contact]);
                          setSearchQuery("");
                          setCommandOpen(false);
                        }}
                      >
                        {contact.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected contacts bubbles */}
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full text-sm"
                  >
                    {contact.name}
                    <button
                      onClick={() => removeContact(contact)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">at...</label>
            <Input
              placeholder="Enter a time (optional)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
