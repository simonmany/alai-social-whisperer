import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: number;
  name: string;
  image?: string;
  email: string;
  group: string;
}

const SAMPLE_CONTACTS: Contact[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", image: "/placeholder.svg", group: "Inner orbit" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", image: "/placeholder.svg", group: "oldest friends" },
  { id: 3, name: "Carol White", email: "carol@example.com", image: "/placeholder.svg", group: "college friends" },
  { id: 4, name: "David Brown", email: "david@example.com", image: "/placeholder.svg", group: "Work contacts" },
  { id: 5, name: "Eve Wilson", email: "eve@example.com", image: "/placeholder.svg", group: "golf friends" },
  { id: 6, name: "Frank Miller", email: "frank@example.com", image: "/placeholder.svg", group: "Family" },
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

  const filteredContacts = SAMPLE_CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                <AvatarImage src="/placeholder.svg" alt="Your profile" />
                <AvatarFallback>You</AvatarFallback>
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

          {/* Contact Groups */}
          <div className="mt-8 space-y-2">
            <h3 className="text-lg font-semibold mb-4">Contact Groups</h3>
            <div className="flex flex-wrap gap-2">
              {CONTACT_GROUPS.map((group) => (
                <Badge
                  key={group}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                >
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsView;