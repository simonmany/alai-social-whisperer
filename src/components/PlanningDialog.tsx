import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Users, Calendar as CalendarIcon, MapPin, Bot, ArrowLeft, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { InterestSelector } from "@/components/InterestSelector";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultContacts?: Contact[];
}

const TIME_OPTIONS = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
];

const PlanningDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultContacts = []
}: PlanningDialogProps) => {
  const [step, setStep] = useState<'main' | 'contacts' | 'activity' | 'datetime'>("main");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(defaultContacts);
  const [contactInput, setContactInput] = useState("");
  const [activity, setActivity] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("main");
        setSelectedContacts(defaultContacts);
        setContactInput("");
        setActivity("");
        setLocation("");
        setSelectedDate(undefined);
        setSelectedTime(undefined);
      }, 100);
    }
  }, [open, defaultContacts]);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log("No user session found");
        return [];
      }
      
      console.log("Fetching contacts for user:", session.user.id);
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) {
        console.error("Error fetching contacts:", error);
        throw error;
      }
      
      console.log("Fetched contacts:", data);
      return (data || []).map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!session?.user?.id
  });

  const filteredContacts = contacts.filter(contact => 
    !selectedContacts.some(selected => selected.id === contact.id) &&
    (contactInput === "" || contact.name.toLowerCase().includes(contactInput.toLowerCase()))
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const addContact = (contact: Contact) => {
    setSelectedContacts(prev => [...prev, contact]);
    setContactInput("");
  };

  const removeContact = (contactToRemove: Contact) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== contactToRemove.id));
  };

  const handleSuggestContact = () => {
    console.log("handleSuggestContact called");
    console.log("Current contacts state:", contacts);
    console.log("Current selectedContacts state:", selectedContacts);
    
    if (isLoading) {
      console.log("Contacts are still loading");
      toast({
        title: "Loading contacts",
        description: "Please wait while we load your contacts",
      });
      return;
    }

    if (!contacts || contacts.length === 0) {
      console.log("No contacts found in database");
      toast({
        title: "No contacts found",
        description: "Add some contacts first",
        variant: "destructive",
      });
      return;
    }

    const availableContacts = contacts.filter(
      contact => !selectedContacts.some(selected => selected.id === contact.id)
    );

    console.log("Available contacts after filtering:", availableContacts);

    if (availableContacts.length === 0) {
      console.log("No available contacts to suggest");
      toast({
        title: "No more contacts available",
        description: "All contacts have been selected",
        variant: "destructive",
      });
    } else {
      const randomContact = availableContacts[Math.floor(Math.random() * availableContacts.length)];
      console.log("Selected random contact:", randomContact);
      addContact(randomContact);
    }
  };

  const getNextStep = () => {
    if (!isComplete.contacts) return 'contacts';
    if (!isComplete.activity) return 'activity';
    if (!isComplete.datetime) return 'datetime';
    return 'main';
  };

  const getNextButtonText = () => {
    if (!isComplete.contacts) return "Next - who's coming?";
    if (!isComplete.activity) return "Next - what are we doing?";
    if (!isComplete.datetime) return "Next - pick a time";
    return "Done";
  };

  const handleSubmit = async () => {
    if (!allFieldsComplete || !session?.user?.id) return;

    try {
      const [hours, minutes, period] = selectedTime!.match(/(\d+):(\d+) (AM|PM)/)!.slice(1);
      let hour = parseInt(hours);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      
      const startTime = new Date(selectedDate!);
      startTime.setHours(hour, parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: session.user.id,
          title: activity,
          location: location,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const attendeesToInsert = selectedContacts.map(contact => ({
        event_id: eventData.id,
        contact_id: contact.id
      }));

      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .insert(attendeesToInsert);

      if (attendeesError) throw attendeesError;

      toast({
        title: "Event created!",
        description: `${activity} has been scheduled for ${format(startTime, 'EEE, MMM d')} at ${selectedTime}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    const next = getNextStep();
    if (next === 'main') {
      if (allFieldsComplete) {
        handleSubmit();
      } else {
        toast({
          title: "Please complete all fields",
          description: "Fill in all the details to create your event",
          variant: "destructive",
        });
      }
    } else {
      setStep(next);
    }
  };

  const renderContactsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setStep('main')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("Suggest someone button clicked");
            handleSuggestContact();
          }}
          className="text-sm gap-2"
        >
          <Bot className="h-4 w-4" />
          Suggest someone
        </Button>
      </div>

      <Input
        placeholder="Search contacts..."
        value={contactInput}
        onChange={(e) => setContactInput(e.target.value)}
        className="h-9"
      />

      {contactInput && filteredContacts.length > 0 && (
        <div className="border rounded-md divide-y">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-2 hover:bg-accent flex items-center justify-between cursor-pointer"
              onClick={() => addContact(contact)}
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

      {selectedContacts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected contacts:</div>
          <div className="flex flex-wrap gap-2">
            {selectedContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full text-xs"
              >
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[10px]">{getInitials(contact.name)}</AvatarFallback>
                </Avatar>
                <span>{contact.name}</span>
                <button
                  onClick={() => removeContact(contact)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleNextStep}
          disabled={selectedContacts.length === 0}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  );

  const renderActivityStep = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setStep('main')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">What are we doing?</Label>
          <div className="mt-2">
            <InterestSelector
              type="activities"
              placeholder="Type to search activities or add a new one..."
              minSelections={1}
              initialSelections={activity ? [activity] : []}
              onComplete={(activities) => {
                if (activities.length > 0) {
                  setActivity(activities[0]);
                } else {
                  setActivity("");
                }
              }}
            />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Where are we going?</Label>
          <div className="mt-2">
            <Input
              placeholder="Enter location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleNextStep}
          disabled={!activity || !location}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  );

  const renderDateTimeStep = () => (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setStep('main')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">What day?</Label>
          <div className="mt-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
              disabled={(date) => date < new Date()}
            />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">What time?</Label>
          <div className="mt-2">
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleNextStep}
          disabled={!selectedDate || !selectedTime}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  );

  const renderMainStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start text-left h-auto py-4 px-6"
          onClick={() => setStep('contacts')}
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium mb-0.5">Who's coming?</div>
              {selectedContacts.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Select contacts to invite</div>
              )}
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start text-left h-auto py-4 px-6"
          onClick={() => setStep('activity')}
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium mb-0.5">What's the activity, and where?</div>
              {activity && location ? (
                <div className="text-sm text-muted-foreground">
                  {activity} at {location}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Choose an activity and location</div>
              )}
            </div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start text-left h-auto py-4 px-6"
          onClick={() => setStep('datetime')}
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium mb-0.5">When's it happening?</div>
              {selectedDate && selectedTime ? (
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEE, MMM d')} at {selectedTime}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Pick a date and time</div>
              )}
            </div>
          </div>
        </Button>
      </div>

      <Button 
        className="w-full bg-black hover:bg-black/90 text-white"
        onClick={handleSubmit}
        disabled={!allFieldsComplete}
      >
        {allFieldsComplete ? "Create Event" : "Fill in all details"}
      </Button>
    </div>
  );

  const isComplete = {
    contacts: selectedContacts.length > 0,
    activity: !!activity && !!location,
    datetime: !!selectedDate && !!selectedTime
  };

  const allFieldsComplete = isComplete.contacts && isComplete.activity && isComplete.datetime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Let's plan your next hang</DialogTitle>
        </DialogHeader>

        {step === 'main' && renderMainStep()}
        {step === 'contacts' && renderContactsStep()}
        {step === 'activity' && renderActivityStep()}
        {step === 'datetime' && renderDateTimeStep()}
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
