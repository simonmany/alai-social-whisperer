
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";

interface ActivitySelectorProps {
  contact: Contact | null;
  value: string;
  onValueChange: (activity: string) => void;
}

export const ActivitySelector = ({ contact, value, onValueChange }: ActivitySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);

  useEffect(() => {
    const loadActivities = async () => {
      if (contact?.interests && Array.isArray(contact.interests)) {
        // If the contact has interests, use those
        setActivities(contact.interests);
      } else {
        // Otherwise, load from activities table
        const { data, error } = await supabase
          .from('activities')
          .select('name')
          .order('name');
        
        if (data && !error) {
          setActivities(data.map(a => a.name));
        }
      }
    };

    loadActivities();
  }, [contact]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Select an activity..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search activities..." />
          <CommandEmpty>No activity found.</CommandEmpty>
          <CommandGroup>
            {activities.map((activity) => (
              <CommandItem
                key={activity}
                onSelect={() => {
                  onValueChange(activity);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === activity ? "opacity-100" : "opacity-0"
                  )}
                />
                {activity}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
