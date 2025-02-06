import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Utensils, Palette, MapPin, PartyPopper, Plane, CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Autocomplete from 'react-google-autocomplete';
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  // Generate time slots from 7 AM to 11 PM
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
        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }
        if (!data?.apiKey) {
          console.error('No API key returned:', data);
          throw new Error('No API key returned from function');
        }
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

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', selectedCategory],
    queryFn: async () => {
      if (selectedCategory === "Food / Drinks") {
        const { data, error } = await supabase
          .from('food_items')
          .select('name');
        if (error) throw error;
        return data.map(item => item.name);
      } else if (selectedCategory === "Recreation" || selectedCategory === "Arts") {
        const { data, error } = await supabase
          .from('activities')
          .select('name')
          .filter('category', 'eq', selectedCategory === "Recreation" ? "recreation" : "arts");
        if (error) throw error;
        return data.map(item => item.name);
      }
      return [];
    },
    enabled: !!selectedCategory && ["Food / Drinks", "Recreation", "Arts"].includes(selectedCategory)
  });

  // Filter contacts based on search input and already selected contacts, limit to 5
  const filteredContacts = (contacts || []).filter(contact => 
    !selectedContacts.some(selected => selected.id === contact.id) &&
    contact.name.toLowerCase().includes(contactInput.toLowerCase())
  ).slice(0, 5);

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
    if (category === "A Party!") {
      setShowCustomSpot(true);
    } else if (category === "A Trip") {
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

  const generateMessage = () => {
    const hasActivity = activity.trim() !== "";
    const hasContacts = selectedContacts.length > 0;
    const hasDateTime = selectedDate && selectedTime;

    // All fields blank
    if (!hasActivity && !hasContacts && !hasDateTime) {
      return "Find me something to do!";
    }

    // Only one field filled
    if (hasActivity && !hasContacts && !hasDateTime) {
      return `I want to ${activity}. Find me some people and a time!`;
    }
    if (!hasActivity && hasContacts && !hasDateTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      return `I want to hang with ${contactNames}. Find us an activity and a time!`;
    }
    if (!hasActivity && !hasContacts && hasDateTime) {
      const formattedDate = format(selectedDate, 'MMMM do');
      return `Find me a hang on ${formattedDate} at ${selectedTime}`;
    }

    // Two fields filled
    if (hasActivity && hasContacts && !hasDateTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      return `Find me a time to ${activity} with ${contactNames}!`;
    }
    if (hasActivity && !hasContacts && hasDateTime) {
      const formattedDate = format(selectedDate, 'MMMM do');
      return `Find me someone to ${activity} with on ${formattedDate} at ${selectedTime}!`;
    }
    if (!hasActivity && hasContacts && hasDateTime) {
      const contactNames = selectedContacts.map(c => c.name).join(", ");
      const formattedDate = format(selectedDate, 'MMMM do');
      return `Find me something to do with ${contactNames} on ${formattedDate} at ${selectedTime}!`;
    }

    // All fields filled
    const contactNames = selectedContacts.map(c => c.name).join(", ");
    const formattedDate = format(selectedDate, 'MMMM do');
    return `I want to ${activity} with ${contactNames} on ${formattedDate} at ${selectedTime}`;
  };

  const handleSubmit = () => {
    const message = generateMessage();
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
          <div className="flex items-center gap-2">
            <DialogTitle>Plan a Hang</DialogTitle>
            {selectedCategory && (
              <>
                <span className="text-muted-foreground">·</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedCategory}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={handleCategoryDeselect}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!selectedCategory ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Little Plans</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("Food / Drinks")}
                    className="flex flex-col gap-2 h-auto py-4"
                  >
                    <Utensils className="h-5 w-5" />
                    <span>Food / Drinks</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("Recreation")}
                    className="flex flex-col gap-2 h-auto py-4"
                  >
                    <MapPin className="h-5 w-5" />
                    <span>Recreation</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("Arts")}
                    className="flex flex-col gap-2 h-auto py-4"
                  >
                    <Palette className="h-5 w-5" />
                    <span>Arts</span>
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Big Plans</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Party!")}
                    className="flex flex-col gap-2 h-auto py-4"
                  >
                    <PartyPopper className="h-5 w-5" />
                    <span>A Party!</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Trip")}
                    className="flex flex-col gap-2 h-auto py-4"
                  >
                    <Plane className="h-5 w-5" />
                    <span>A Trip</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedCategory === "A Party!" && (
                <div className="text-sm text-muted-foreground mb-4">
                  Nice! Where's the party at?
                </div>
              )}
              {selectedCategory === "A Trip" && (
                <div className="text-sm text-muted-foreground mb-4">
                  Nice! Where are we going?
                </div>
              )}
              {!showCustomSpot ? (
                <>
                  <Input
                    placeholder={`Search ${selectedCategory} suggestions...`}
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    list="suggestions"
                  />
                  {suggestions && suggestions.length > 0 && (
                    <datalist id="suggestions">
                      {suggestions.map((suggestion, index) => (
                        <option key={index} value={suggestion} />
                      ))}
                    </datalist>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowCustomSpot(true)}
                  >
                    I have a spot in mind
                  </Button>
                </>
              ) : (
                <>
                  {selectedCategory === "A Trip" && mapsApiKey ? (
                    <Autocomplete
                      apiKey={mapsApiKey}
                      onPlaceSelected={(place: any) => {
                        if (place && typeof place === 'object') {
                          const address = place.formatted_address || place.name || '';
                          if (address) {
                            setActivity(address);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                      placeholder="Enter your destination..."
                    />
                  ) : (
                    <Input
                      placeholder={selectedCategory === "A Trip" ? "Loading location selector..." : "Enter your spot!"}
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                    />
                  )}
                </>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Invite some people, or have AI pick:</label>
            <div className="relative">
              <Input
                placeholder="Type to search contacts..."
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
              />
              {contactInput && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="px-4 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={() => addContact(contact)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <span>{contact.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
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
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Select a date and time, or have AI pick:</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-[180px]">
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

          <Button onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
