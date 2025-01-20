import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (activity: string, contact: string, time: string) => void;
}

const ACTIVITIES = [
  "get coffee",
  "grab lunch",
  "go for a walk",
  "play basketball",
  "watch a movie",
  "have dinner",
  "go hiking",
  "play video games",
];

const CONTACTS = [
  "Alex",
  "Sam",
  "Jordan",
  "Taylor",
  "Morgan",
  "A New Friend",
];

const TIMES = [
  "tomorrow morning",
  "tomorrow afternoon",
  "tomorrow evening",
  "this weekend",
  "next week",
  "sometime soon",
];

const PlanningDialog = ({ open, onOpenChange, onSubmit }: PlanningDialogProps) => {
  const [activity, setActivity] = useState("");
  const [contact, setContact] = useState("");
  const [time, setTime] = useState("");
  const [openActivity, setOpenActivity] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openTime, setOpenTime] = useState(false);

  const handleSubmit = () => {
    if (activity && contact && time) {
      onSubmit(activity, contact, time);
      setActivity("");
      setContact("");
      setTime("");
    }
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
            <Popover open={openActivity} onOpenChange={setOpenActivity}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openActivity}
                  className="justify-between"
                >
                  {activity || "(choose an activity)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search activities..." />
                  <CommandEmpty>No activity found.</CommandEmpty>
                  <CommandGroup>
                    {ACTIVITIES.map((act) => (
                      <CommandItem
                        key={act}
                        value={act}
                        onSelect={(currentValue) => {
                          setActivity(currentValue);
                          setOpenActivity(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            activity === act ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {act}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">with...</label>
            <Popover open={openContact} onOpenChange={setOpenContact}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openContact}
                  className="justify-between"
                >
                  {contact || "(choose a person)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandEmpty>No contact found.</CommandEmpty>
                  <CommandGroup>
                    {CONTACTS.map((cont) => (
                      <CommandItem
                        key={cont}
                        value={cont}
                        onSelect={(currentValue) => {
                          setContact(currentValue);
                          setOpenContact(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            contact === cont ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {cont}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">at...</label>
            <Popover open={openTime} onOpenChange={setOpenTime}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTime}
                  className="justify-between"
                >
                  {time || "(choose a time)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search times..." />
                  <CommandEmpty>No time found.</CommandEmpty>
                  <CommandGroup>
                    {TIMES.map((t) => (
                      <CommandItem
                        key={t}
                        value={t}
                        onSelect={(currentValue) => {
                          setTime(currentValue);
                          setOpenTime(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            time === t ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {t}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!activity || !contact || !time}
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;