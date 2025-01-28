import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronUp, MessageCircle, Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useToast } from "@/hooks/use-toast";
import GroupManagementDialog from "@/components/GroupManagementDialog";
import ContactGroupsManager from "@/components/ContactGroupsManager";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  group: string;
  closeness: number;
}

const CONTACT_GROUPS = [
  "All contacts",
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
  const [selectedGroup, setSelectedGroup] = useState<string>("All contacts");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    }
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('closeness', { ascending: false });

      if (error) throw error;
      
      return data.map(contact => ({
        ...contact,
        group: CONTACT_GROUPS[Math.floor(Math.random() * (CONTACT_GROUPS.length - 1)) + 1], // Skip "All contacts"
      }));
    }
  });

  const handleAvatarUpdate = (newUrl: string) => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedGroup === "All contacts" || contact.group === selectedGroup)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  return (
    <div className="fixed inset-0 bg-background animate-slide-in-top">
      <div className="container max-w-2xl mx-auto p-4 h-full">
        <div className="relative flex flex-col h-full">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <AvatarUpload
                url={profileData?.avatar_url ?? undefined}
                onUploadComplete={handleAvatarUpdate}
                fallback={profileData?.display_name?.charAt(0) || 'U'}
                size="lg"
              />
            </div>

            <div className="relative h-full">
              {filteredContacts.map((contact, index) => {
                const angle = (index * 2 * Math.PI) / filteredContacts.length;
                const radius = 140 * (1 - contact.closeness * 0.5);
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
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <div className="p-4 space-y-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20">
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-2xl font-bold">{contact.name}</h2>
                            {contact.email && (
                              <p className="text-muted-foreground">{contact.email}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-2">
                              Closeness: {(contact.closeness * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        
                        <ContactGroupsManager contactId={contact.id} />
                      </div>
                    </DrawerContent>
                  </Drawer>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-8 mb-4">
            <Button variant="outline" className="w-full max-w-sm" onClick={() => setIsGroupDialogOpen(true)}>
              <Plus className="mr-2" />
              Create New Group
            </Button>
          </div>

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

      <GroupManagementDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
        contacts={contacts}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default ContactsView;
