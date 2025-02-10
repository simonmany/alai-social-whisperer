
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X, Utensils, Palette, MapPin, PartyPopper, Plane, CalendarIcon, Bot, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import Autocomplete from 'react-google-autocomplete';
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
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
        .select('id, name, email')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');
      
      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }

      console.log('Total contacts fetched in planning dialog:', data?.length);
      return data || [];
    }
  });

  const { data: foodItems } = useQuery({
    queryKey: ['food_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('name');
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCategory === "Food / Drinks"
  });

  const { data: recreationItems } = useQuery({
    queryKey: ['recreation_activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('name')
        .eq('category', 'recreation');
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCategory === "Recreation"
  });

  const { data: artsItems } = useQuery({
    queryKey: ['arts_activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('name')
        .eq('category', 'arts');
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCategory === "Arts"
  });

  const getFilteredSuggestions = () => {
    if (!activity.trim() || selectedCategory === "A Trip" || selectedCategory === "A Party!") return [];

    let suggestions: { name: string }[] = [];
    switch (selectedCategory) {
      case "Food / Drinks":
        suggestions = foodItems?.filter(item => 
          item.name.toLowerCase().includes(activity.toLowerCase()) &&
          item.name.toLowerCase() !== activity.toLowerCase()
        ).slice(0, 5) || [];
        break;
      case "Recreation":
        suggestions = recreationItems?.filter(item => 
          item.name.toLowerCase().includes(activity.toLowerCase()) &&
          item.name.toLowerCase() !== activity.toLowerCase()
        ).slice(0, 5) || [];
        break;
      case "Arts":
        suggestions = artsItems?.filter(item => 
          item.name.toLowerCase().includes(activity.toLowerCase()) &&
          item.name.toLowerCase() !== activity.toLowerCase()
        ).slice(0, 5) || [];
        break;
    }
    return suggestions;
  };

  const handleAiPickActivity = () => {
    const categories = [
      { type: "Food / Drinks", items: foodItems },
      { type: "Recreation", items: recreationItems },
      { type: "Arts", items: artsItems }
    ].filter(category => category.items && category.items.length > 0);

    if (categories.length === 0) {
      toast({
        title: "No activities available",
        description: "Please try again later",
        variant: "destructive",
      });
      return;
    }

    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomItem = randomCategory.items[Math.floor(Math.random() * randomCategory.items.length)];
    
    handleCategorySelect(randomCategory.type as ActivityCategory);
    setActivity(randomItem.name);
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

  const handleAiPickDateTime = () => {
    const today = new Date();
    const randomDays = Math.floor(Math.random() * 30);
    const randomDate = addDays(today, randomDays);
    
    const randomHour = Math.floor(Math.random() * 17) + 7; // 7 AM to 11 PM
    const period = randomHour >= 12 ? 'PM' : 'AM';
    const displayHour = randomHour > 12 ? randomHour - 12 : randomHour;
    const randomTime = `${displayHour}:00 ${period}`;

    setSelectedDate(randomDate);
    setSelectedTime(randomTime);
  };

  const filteredContacts = contacts
    ? contacts.filter(contact => 
        contact.name.toLowerCase().includes(contactInput.toLowerCase()) &&
        !selectedContacts.some(selected => selected.id === contact.id)
      )
    : [];

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

  const handleBackFromCustomSpot = () => {
    setShowCustomSpot(false);
    setActivity("");
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
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">Plan a Hang</DialogTitle>
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
        <div className="flex flex-col gap-3 mt-4">
          {!selectedCategory ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Little Plans</h3>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleAiPickActivity}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Have Al pick
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleCategorySelect("Food / Drinks")}
                  className="flex flex-col gap-1 h-auto py-2 px-2"
                >
                  <Utensils className="h-4 w-4" />
                  <span className="text-xs">Food / Drinks</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleCategorySelect("Recreation")}
                  className="flex flex-col gap-1 h-auto py-2 px-2"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs">Recreation</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleCategorySelect("Arts")}
                  className="flex flex-col gap-1 h-auto py-2 px-2"
                >
                  <Palette className="h-4 w-4" />
                  <span className="text-xs">Arts</span>
                </Button>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Big Plans</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Party!")}
                    className="flex flex-col gap-1 h-auto py-2"
                  >
                    <PartyPopper className="h-4 w-4" />
                    <span className="text-xs">A Party!</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Trip")}
                    className="flex flex-col gap-1 h-auto py-2"
                  >
                    <Plane className="h-4 w-4" />
                    <span className="text-xs">A Trip</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedCategory === "A Party!" && (
                <div className="text-sm text-muted-foreground mb-2">
                  Nice! Where's the party at?
                </div>
              )}
              {selectedCategory === "A Trip" && (
                <div className="text-sm text-muted-foreground mb-2">
                  Nice! Where are we going?
                </div>
              )}
              {!showCustomSpot ? (
                <>
                  <div className="relative">
                    <Input
                      placeholder={`Search ${selectedCategory} suggestions...`}
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="h-8"
                    />
                    {activity && !selectedCategory?.includes("A ") && getFilteredSuggestions().length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[120px] overflow-y-auto">
                        {getFilteredSuggestions().map((item) => (
                          <div
                            key={item.name}
                            className="px-2 py-1 hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setActivity(item.name);
                              setContactInput("");
                            }}
                          >
                            <span className="text-sm">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-8 text-sm"
                    onClick={() => setShowCustomSpot(true)}
                  >
                    I have a spot in mind
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleBackFromCustomSpot}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
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
                        className="w-full px-3 h-8 bg-background border border-input rounded-md text-sm"
                        placeholder="Enter your destination..."
                      />
                    ) : (
                      <Input
                        placeholder={selectedCategory === "A Trip" ? "Loading location selector..." : "Enter your spot!"}
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        className="h-8"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
                      className="px-2 py-1 hover:bg-accent cursor-pointer flex items-center gap-2"
                      onClick={() => addContact(contact)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{contact.name}</span>
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select a date and time</label>
              <Button 
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleAiPickDateTime}
              >
                <Bot className="h-3.5 w-3.5" />
                Have Al pick
              </Button>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal h-8 text-sm flex-1",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0" 
                  align="start" 
                  side="bottom"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="cursor-pointer hover:cursor-pointer">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="h-8 text-sm w-[130px]">
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time} className="text-sm">
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-8">
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningDialog;
