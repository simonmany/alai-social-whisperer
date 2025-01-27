import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronUp, MessageCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: number;
  name: string;
  image?: string;
  email: string;
  group: string;
}

const SAMPLE_CONTACTS: Contact[] = [
  // Inner orbit
  { id: 1, name: "Alice Johnson", email: "alice@example.com", image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7", group: "Inner orbit" },
  { id: 2, name: "Bob Wilson", email: "bob@example.com", image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b", group: "Inner orbit" },
  { id: 3, name: "Carol Smith", email: "carol@example.com", image: "https://images.unsplash.com/photo-1518770660439-4636190af475", group: "Inner orbit" },
  
  // Oldest friends
  { id: 4, name: "David Brown", email: "david@example.com", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6", group: "oldest friends" },
  { id: 5, name: "Emma Davis", email: "emma@example.com", image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d", group: "oldest friends" },
  { id: 6, name: "Frank Miller", email: "frank@example.com", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158", group: "oldest friends" },
  
  // College friends
  { id: 7, name: "Grace Lee", email: "grace@example.com", image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81", group: "college friends" },
  { id: 8, name: "Henry Wang", email: "henry@example.com", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", group: "college friends" },
  { id: 9, name: "Ivy Chen", email: "ivy@example.com", image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7", group: "college friends" },
  
  // Work contacts
  { id: 10, name: "Jack Thompson", email: "jack@example.com", image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b", group: "Work contacts" },
  { id: 11, name: "Karen White", email: "karen@example.com", image: "https://images.unsplash.com/photo-1518770660439-4636190af475", group: "Work contacts" },
  { id: 12, name: "Leo Martinez", email: "leo@example.com", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6", group: "Work contacts" },
  
  // Golf friends
  { id: 13, name: "Mike Anderson", email: "mike@example.com", image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d", group: "golf friends" },
  { id: 14, name: "Nancy Clark", email: "nancy@example.com", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158", group: "golf friends" },
  { id: 15, name: "Oliver Scott", email: "oliver@example.com", image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81", group: "golf friends" },
  
  // Family
  { id: 16, name: "Patricia Johnson", email: "patricia@example.com", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", group: "Family" },
  { id: 17, name: "Quinn Johnson", email: "quinn@example.com", image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7", group: "Family" },
  { id: 18, name: "Robert Johnson", email: "robert@example.com", image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b", group: "Family" },
];

const CONTACT_GROUPS = [
  "Inner orbit",
  "oldest friends",
  "college friends",
  "Work contacts",
  "golf friends",
  "Family"
];

const ContactsView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("Inner orbit");
  const navigate = useNavigate();

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      console.log('Fetching profile data for contacts view...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      console.log('Profile data fetched for contacts:', profile);
      return profile;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const filteredContacts = SAMPLE_CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedGroup === "" || contact.group === selectedGroup)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-background animate-slide-in-top">
      <div className="container max-w-2xl mx-auto p-4 h-full">
        <div className="relative flex flex-col h-full">
          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Orbital Layout */}
          <div className="flex-1 relative">
            {/* Center Avatar */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Avatar className="h-24 w-24">
                {profileData?.avatar_url && (
                  <AvatarImage src={profileData.avatar_url} alt="Your profile" />
                )}
                <AvatarFallback>
                  {profileData?.display_name?.charAt(0) || 'Y'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Orbiting Contacts */}
            <div className="relative h-full">
              {filteredContacts.map((contact, index) => {
                const angle = (index * 2 * Math.PI) / filteredContacts.length;
                const radius = 140; // Orbit radius in pixels
                const left = `calc(50% + ${Math.cos(angle) * radius}px)`;
                const top = `calc(50% + ${Math.sin(angle) * radius}px)`;

                return (
                  <Drawer key={contact.id}>
                    <DrawerTrigger asChild>
                      <button
                        className="absolute -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                        style={{ left, top }}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={contact.image} alt={contact.name} />
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <div className="p-4 space-y-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={contact.image} alt={contact.name} />
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-2xl font-bold">{contact.name}</h2>
                            <p className="text-muted-foreground">{contact.email}</p>
                            <Badge variant="secondary" className="mt-2">
                              {contact.group}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </DrawerContent>
                  </Drawer>
                );
              })}
            </div>
          </div>

          {/* Ask Al Button */}
          <div className="flex justify-center mt-8 mb-4">
            <Button variant="outline" className="w-full max-w-sm">
              <MessageCircle className="mr-2" />
              Ask Al about this group
            </Button>
          </div>

          {/* Contact Groups */}
          <div className="space-y-2 mb-16">
            <h3 className="text-lg font-semibold mb-4">Contact Groups</h3>
            <div className="flex flex-wrap gap-2">
              {CONTACT_GROUPS.map((group) => (
                <Badge
                  key={group}
                  variant={selectedGroup === group ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedGroup(group)}
                >
                  {group}
                </Badge>
              ))}
            </div>
          </div>

          {/* Back to Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-1/2 -translate-x-1/2"
            onClick={() => navigate("/")}
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactsView;