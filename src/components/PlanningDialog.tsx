
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Utensils, Palette, MapPin, PartyPopper, Plane, CalendarIcon, Bot, ArrowLeft, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Autocomplete from 'react-google-autocomplete';
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface PlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => void;
}

type ActivityCategory = "Food / Drinks" | "Recreation" | "Arts" | "A Party!" | "A Trip" | null;

const PlanningDialog = ({ open, onOpenChange, onSubmit }: PlanningDialogProps) => {
  const [activity, setActivity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>(null);
  const [showCustomSpot, setShowCustomSpot] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  });

  useEffect(() => {
    const fetchMapsKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error) throw error;
        if (!data?.apiKey) throw new Error('No API key returned');
        setMapsApiKey(data.apiKey);
      } catch (error: any) {
        console.error('Error fetching Maps API key:', error);
        toast({
          title: "Error loading location selector",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      }
    };

    if (selectedCategory === "A Trip") {
      fetchMapsKey();
    }
  }, [selectedCategory, toast]);

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
        food_interests: Array.isArray(contact.food_interests) ? contact.food_interests : [],
        recreation_interests: Array.isArray(contact.recreation_interests) ? contact.recreation_interests : [],
        arts_interests: Array.isArray(contact.arts_interests) ? contact.arts_interests : []
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
    setSelectedContacts([...selectedContacts, contact]);
    setContactInput("");
  };

  const removeContact = (contactToRemove: Contact) => {
    setSelectedContacts(selectedContacts.filter(c => c.id !== contactToRemove.id));
  };

  const handleCategorySelect = (category: ActivityCategory) => {
    setSelectedCategory(category);
    if (category === "A Party!" || category === "A Trip") {
      setShowCustomSpot(true);
    } else {
      setShowCustomSpot(false);
    }
    setActivity("");
  };

  const handleCategoryDeselect = () => {
    setSelectedCategory(null);
    setShowCustomSpot(false);
    setActivity("");
  };

  const handleAiPickContact = () => {
    if (!contacts || contacts.length === 0) {
      toast({
        title: "No contacts available",
        description: "Add some contacts first",
        variant: "destructive",
      });
      return;
    }

    const availableContacts = contacts.filter(
      contact => !selectedContacts.some(selected => selected.id === contact.id)
    );

    if (availableContacts.length === 0) {
      toast({
        title: "All contacts already selected",
        description: "Try removing some contacts first",
        variant: "destructive",
      });
      return;
    }

    const randomContact = availableContacts[Math.floor(Math.random() * availableContacts.length)];
    setSelectedContacts([...selectedContacts, randomContact]);
  };

  const generateMessage = () => {
    const hasActivity = activity.trim() !== "";
    const hasContacts = selectedContacts.length > 0;
    const hasDateTime = selectedDate && selectedTime;

    const formatContacts = (contacts: Contact[]) => {
      if (contacts.length === 0) return "";
      if (contacts.length === 1) return contacts[0].name;
      if (contacts.length === 2) return `${contacts[0].name} and ${contacts[1].name}`;
      const allButLast = contacts.slice(0, -1).map(c => c.name).join(", ");
      return `${allButLast}, and ${contacts[contacts.length - 1].name}`;
    };

    const formatActivity = () => {
      switch (selectedCategory) {
        case "Food / Drinks":
          return `get ${activity.toLowerCase()}`;
        case "Recreation":
          return activity.toLowerCase();
        case "Arts":
          return `go to ${activity.toLowerCase()}`;
        case "A Party!":
          return `have a party at ${activity}`;
        case "A Trip":
          return `take a trip to ${activity}`;
        default:
          return activity.toLowerCase();
      }
    };

    if (!hasActivity && !hasContacts && !hasDateTime) {
      return "Help me plan something fun!";
    }

    if (hasActivity && !hasContacts && !hasDateTime) {
      return `I want to ${formatActivity()}. Can you help me find some people and a good time?`;
    }

    if (!hasActivity && hasContacts && !hasDateTime) {
      const contactNames = formatContacts(selectedContacts);
      return `I'd like to plan something with ${contactNames}. What should we do?`;
    }

    if (!hasActivity && !hasContacts && hasDateTime) {
      const formattedDate = format(selectedDate, 'MMMM do');
      return `I'm free on ${formattedDate} at ${selectedTime}. What should I do?`;
    }

    if (hasActivity && hasContacts && !hasDateTime) {
      const contactNames = formatContacts(selectedContacts);
      return `I want to ${formatActivity()} with ${contactNames}. When would be a good time?`;
    }

    if (hasActivity && !hasContacts && hasDateTime) {
      const formattedDate = format(selectedDate, 'MMMM do');
      return `I want to ${formatActivity()} on ${formattedDate} at ${selectedTime}. Who should I invite?`;
    }

    if (!hasActivity && hasContacts && hasDateTime) {
      const contactNames = formatContacts(selectedContacts);
      const formattedDate = format(selectedDate, 'MMMM do');
      return `I'm meeting with ${contactNames} on ${formattedDate} at ${selectedTime}. What should we do?`;
    }

    const contactNames = formatContacts(selectedContacts);
    const formattedDate = format(selectedDate, 'MMMM do');
    return `I want to ${formatActivity()} with ${contactNames} on ${formattedDate} at ${selectedTime}. Can you help make this happen?`;
  };

  const handleSubmit = async () => {
    const message = generateMessage();
    
    if (selectedDate && selectedTime && activity) {
      try {
        const [hour, period] = selectedTime.split(' ');
        const [hourStr] = hour.split(':');
        let hours = parseInt(hourStr);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }

        const startDate = new Date(selectedDate);
        startDate.setHours(hours, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        const { data: eventData, error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            user_id: user.id,
            title: activity,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
          })
          .select()
          .single();

        if (eventError || !eventData) {
          console.error('Error creating calendar event:', eventError);
          toast({
            title: "Error creating event",
            description: "Failed to create calendar event. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (selectedContacts.length > 0) {
          const { error: attendeesError } = await supabase
            .from('event_attendees')
            .insert(
              selectedContacts.map(contact => ({
                event_id: eventData.id,
                contact_id: contact.id
              }))
            );

          if (attendeesError) {
            console.error('Error creating event attendees:', attendeesError);
            toast({
              title: "Warning",
              description: "Event created but failed to associate some attendees.",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: "Event created successfully!",
        });
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        toast({
          title: "Error",
          description: "Failed to create event. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    onSubmit(message);
    setActivity("");
    setSelectedCategory(null);
    setShowCustomSpot(false);
    setSelectedContacts([]);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Plan a Hang</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {!selectedCategory ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Little Plans</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCategorySelect("Food / Drinks")}
                  >
                    <Utensils className="h-6 w-6" />
                    <span className="text-xs">Food / Drinks</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCategorySelect("Recreation")}
                  >
                    <MapPin className="h-6 w-6" />
                    <span className="text-xs">Recreation</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCategorySelect("Arts")}
                  >
                    <Palette className="h-6 w-6" />
                    <span className="text-xs">Arts</span>
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Big Plans</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCategorySelect("A Party!")}
                  >
                    <PartyPopper className="h-6 w-6" />
                    <span className="text-xs">A Party!</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleCategorySelect("A Trip")}
                  >
                    <Plane className="h-6 w-6" />
                    <span className="text-xs">A Trip</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={handleCategoryDeselect}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {selectedCategory === "Food / Drinks" && "What would you like to eat/drink?"}
                  {selectedCategory === "Recreation" && "What activity would you like to do?"}
                  {selectedCategory === "Arts" && "What would you like to see?"}
                  {selectedCategory === "A Party!" && "Where's the party?"}
                  {selectedCategory === "A Trip" && "Where would you like to go?"}
                </label>
                {selectedCategory === "A Trip" && mapsApiKey ? (
                  <Autocomplete
                    apiKey={mapsApiKey}
                    onPlaceSelected={(place) => setActivity(place.formatted_address)}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                ) : (
                  <Input
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="h-8"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Invite some people</label>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleAiPickContact}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Have Al pick
                  </Button>
                </div>
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
                </div>

                {selectedContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-full text-xs"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[10px]">{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <span>{contact.name}</span>
                        {contact.is_archived && (
                          <Archive className="h-3 w-3 text-muted-foreground" />
                        )}
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

              <div className="space-y-2">
                <label className="text-sm font-medium">When would you like to meet?</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] h-8 text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < addDays(new Date(), -1)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Select
                    value={selectedTime}
                    onValueChange={setSelectedTime}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Pick a time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full h-8">
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
