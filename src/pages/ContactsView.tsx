import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronUp, Plus } from "lucide-react";
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
import { useAuth } from "@/components/AuthProvider";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  closeness: number;
}

interface Group {
  id: string;
  name: string;
  emoji?: string | null;
}

interface GroupMembership {
  contact_id: string;
  group_id: string;
}

const ContactsView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("All contacts");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Query to check if user is in tutorial
  const { data: profileData } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step, has_completed_tutorial, avatar_url, display_name')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  const isInTutorial = profileData?.onboarding_step === 'contactsintro' && !profileData?.has_completed_tutorial;

  const handleSkipContacts = async () => {
    if (!session?.user?.id) return;
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'complete',
          has_completed_tutorial: true 
        })
        .eq('id', session.user.id);
      
      navigate('/');
    } catch (error: any) {
      console.error('Error updating tutorial progress:', error);
      toast({
        title: "Error updating tutorial progress",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const { data: contacts = [], isLoading: isLoadingContacts, error: contactsError } = useQuery({
    queryKey: ['contacts', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      console.log('Fetching contacts for user:', session.user.id);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('closeness', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      console.log('Fetched contacts:', data);
      return data as Contact[];
    },
    enabled: !!session?.user?.id,
  });

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['contact_groups', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      return [{ id: 'all', name: 'All contacts', emoji: '🌌' }, ...data] as Group[];
    },
    enabled: !!session?.user?.id,
  });

  const { data: groupMemberships = [] } = useQuery<GroupMembership[]>({
    queryKey: ['group_memberships', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('contact_group_memberships')
        .select('*');

      if (error) throw error;
      return data as GroupMembership[];
    },
    enabled: !!session?.user?.id,
  });

  const getContactGroups = (contactId: string) => {
    const membershipIds = groupMemberships
      .filter(m => m.contact_id === contactId)
      .map(m => m.group_id);
    return groups.filter(g => membershipIds.includes(g.id));
  };

  const getContactEmoji = (contactId: string): string | null => {
    const contactGroups = getContactGroups(contactId);
    if (contactGroups.length === 0) return null;
    return contactGroups[0].emoji || null;
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === "All contacts" || 
      getContactGroups(contact.id).some(g => g.name === selectedGroup);
    return matchesSearch && matchesGroup;
  });

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (contactsError) {
    toast({
      title: "Error loading contacts",
      description: "There was a problem loading your contacts. Please try again.",
      variant: "destructive",
    });
  }

  if (isLoadingContacts || isLoadingGroups) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  if (isInTutorial) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md text-center space-y-6">
          <p className="text-lg">
            Your relationships are a beautiful Constellation, but right now it's a bit empty.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleSkipContacts}>
              Connect Contacts
            </Button>
            <Button variant="outline" onClick={handleSkipContacts}>
              Not Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Galaxy background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
        style={{ 
          backgroundImage: 'url("/lovable-uploads/2d5625f4-eacc-494d-b391-4d338902ebb4.png")',
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      </div>

      <div className="container max-w-2xl mx-auto p-4 h-full relative z-10">
        <div className="relative flex flex-col h-full">
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-black/50 border-purple-500/50 text-white"
            />
          </div>

          <div className="flex-1 relative">
            {/* Container for the orbit system */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Central user avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse" />
                <AvatarUpload
                  url={profileData?.avatar_url ?? undefined}
                  onUploadComplete={(url) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
                  fallback={getInitials(profileData?.display_name || 'U')}
                  size="lg"
                />
              </div>

              {/* Orbiting contacts */}
              {filteredContacts.map((contact, index) => {
                const angle = (index * 2 * Math.PI) / filteredContacts.length;
                const radius = 140 * (1 - contact.closeness * 0.5);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <Drawer key={contact.id}>
                    <DrawerTrigger asChild>
                      <button
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                        }}
                      >
                        <div className="relative">
                          <Avatar className="h-16 w-16 bg-purple-900/50 border-2 border-purple-500/50 hover:border-purple-400">
                            <AvatarFallback>
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          {getContactEmoji(contact.id) && (
                            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-lg">
                              {getContactEmoji(contact.id)}
                            </div>
                          )}
                        </div>
                        <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2">
                          {contact.name}
                        </div>
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-black/90 border-purple-500/50">
                      <div className="p-4 space-y-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20 bg-purple-900/50 border-2 border-purple-500/50">
                            <AvatarFallback>
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-2xl font-bold text-white">{contact.name}</h2>
                            {contact.email && (
                              <p className="text-purple-300">{contact.email}</p>
                            )}
                            <p className="text-sm text-purple-400 mt-2">
                              Orbit Distance: {((1 - contact.closeness) * 100).toFixed(0)}%
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
            <Button
              variant="outline"
              className="w-full max-w-sm bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50"
              onClick={() => setIsGroupDialogOpen(true)}
            >
              <Plus className="mr-2" />
              Create New Group
            </Button>
          </div>

          <div className="space-y-2 mb-16">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Groups</h3>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Badge
                  key={group.id}
                  variant={selectedGroup === group.name ? "default" : "outline"}
                  className={`cursor-pointer hover:bg-purple-800/50 ${
                    selectedGroup === group.name
                      ? "bg-purple-600"
                      : "bg-purple-900/50 border-purple-500/50 text-purple-100"
                  }`}
                  onClick={() => setSelectedGroup(group.name)}
                >
                  {group.emoji || "👥"} {group.name}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white hover:bg-purple-900/50"
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
        onGroupCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['contact_groups'] });
          queryClient.invalidateQueries({ queryKey: ['group_memberships'] });
        }}
      />

      <style>
        {`
          @keyframes orbit {
            from {
              transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg);
            }
            to {
              transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default ContactsView;
