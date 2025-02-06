
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [time, setTime] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactInput, setContactInput] = useState("");

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
    setShowCustomSpot(false);
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
    setSelectedCategory(null);
    setShowCustomSpot(false);
    setSelectedContacts([]);
    setTime("");
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
                  >
                    Food / Drinks
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("Recreation")}
                  >
                    Recreation
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("Arts")}
                  >
                    Arts
                  </Button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Big Plans</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Party!")}
                  >
                    A Party!
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCategorySelect("A Trip")}
                  >
                    A Trip
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
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
                <Input
                  placeholder="Enter your spot! (Google Maps API to be integrated)"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
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
            <label className="text-sm font-medium">Select a time, or have AI pick:</label>
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
