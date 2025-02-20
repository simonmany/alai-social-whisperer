
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Users, Calendar, MapPin, Bot, ArrowLeft, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultContacts?: Contact[];
}

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
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const { toast } = useToast();
  const { session } = useAuth();

  // Reset state only when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("main");
        setSelectedContacts(defaultContacts);
        setContactInput("");
        setActivity("");
        setSelectedDate(undefined);
        setSelectedTime(undefined);
      }, 100); // Small delay to ensure dialog is closed first
    }
  }, [open, defaultContacts]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', contactInput],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .ilike('name', `%${contactInput}%`)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(contact => ({
        ...contact,
        interests: Array.isArray(contact.interests) ? contact.interests : [],
      })) as Contact[];
    },
    enabled: !!session?.user?.id && contactInput.length > 0
  });

  const filteredContacts = contacts.filter(contact => 
    !selectedContacts.some(selected => selected.id === contact.id)
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
    const availableContacts = contacts.filter(
      contact => !selectedContacts.some(selected => selected.id === contact.id)
    );

    if (availableContacts.length === 0) {
      toast({
        title: "No contacts available",
        description: "Add some contacts first or remove selected ones",
        variant: "destructive",
      });
      return;
    }

    const randomContact = availableContacts[Math.floor(Math.random() * availableContacts.length)];
    addContact(randomContact);
  };

  const isComplete = {
    contacts: selectedContacts.length > 0,
    activity: !!activity,
    datetime: !!selectedDate && !!selectedTime
  };

  const allFieldsComplete = isComplete.contacts && isComplete.activity && isComplete.datetime;

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
          onClick={handleSuggestContact}
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
          onClick={() => setStep('main')}
          disabled={selectedContacts.length === 0}
        >
          Done
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
              {activity ? (
                <div className="text-sm text-muted-foreground">{activity}</div>
              ) : (
                <div className="text-sm text-muted-foreground">Choose an activity</div>
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
            <Calendar className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium mb-0.5">When's it happening?</div>
              {selectedDate && selectedTime ? (
                <div className="text-sm text-muted-foreground">
                  {selectedDate.toLocaleDateString()} at {selectedTime}
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
        onClick={() => {
          toast({
            title: "Coming soon!",
            description: "This feature is under development",
          });
        }}
      >
        {allFieldsComplete ? "Submit" : "Figure it out for me"}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Let's plan your next hang</DialogTitle>
        </DialogHeader>

        {step === 'main' && renderMainStep()}
        {step === 'contacts' && renderContactsStep()}
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
