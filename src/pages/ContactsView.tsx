import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronUp, Plus, ArrowLeft } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
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
  phone?: string;
  meeting_story?: string;
  relationship?: string;
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

interface ContactDrawerContent {
  lastHangout?: {
    image?: string;
    description: string;
    date?: string;
  };
  knownSince?: string;
  highlights?: Array<{
    image: string;
    caption: string;
  }>;
  description?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ContactsView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("Home");
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();

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
      console.log('Profile data in contacts view:', data);
      return data;
    },
    enabled: !!session?.user?.id
  });

  useEffect(() => {
    const updateTutorialStep = async () => {
      if (
        session?.user?.id &&
        profileData?.onboarding_step === 'contactsintro' &&
        !profileData?.has_completed_tutorial
      ) {
        console.log('ContactsView mounted during tutorial, updating step to contactsopen');
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ onboarding_step: 'contactsopen' })
            .eq('id', session.user.id);

          if (error) {
            console.error('Error updating tutorial step in ContactsView:', error);
          } else {
            console.log('Successfully updated tutorial step to contactsopen in ContactsView');
            queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
          }
        } catch (error) {
          console.error('Error in updateTutorialStep:', error);
        }
      }
    };

    updateTutorialStep();
  }, [session?.user?.id, profileData, queryClient]);

  const isInTutorial = profileData?.onboarding_step === 'contactsopen' && !profileData?.has_completed_tutorial;

  const handleSkipContacts = async () => {
    if (!session?.user?.id) return;
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_step: 'calendarintro'
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
      const { data, error, count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('closeness', { ascending: false })
        .limit(100); // Adding limit temporarily to test

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      console.log('Total contacts count:', count);
      console.log('Fetched contacts sample:', data?.slice(0, 5));
      return data as Contact[];
    },
    enabled: !!session?.user?.id,
  });

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['contact_groups', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      const defaultGroups = [
        { id: 'home', name: 'Home', emoji: '🏠' },
        { id: 'inner-orbit', name: 'Inner Orbit', emoji: '✨' }
      ];
      
      return [...defaultGroups, ...data] as Group[];
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

  const getInnerOrbitContacts = () => {
    return [...contacts]
      .sort((a, b) => (b.closeness || 0) - (a.closeness || 0))
      .slice(0, 6);
  };

  const getUserCreatedGroups = () => {
    return groups.filter(g => g.id !== 'home' && g.id !== 'inner-orbit');
  };

  const getContactsForGroup = (groupName: string) => {
    console.log('Getting contacts for group:', groupName);
    console.log('Available groups:', groups);
    
    if (groupName === "Inner Orbit") {
      return getInnerOrbitContacts();
    }
    if (groupName === "Home") {
      return filteredContacts;
    }
    
    const selectedGroupData = groups.find(g => g.name === groupName);
    console.log('Selected group data:', selectedGroupData);
    
    if (!selectedGroupData) return [];
    
    const groupContacts = filteredContacts.filter(contact => 
      groupMemberships.some(m => 
        m.contact_id === contact.id && m.group_id === selectedGroupData.id
      )
    );
    
    console.log('Group memberships:', groupMemberships);
    console.log('Filtered contacts for group:', groupContacts);
    
    return groupContacts;
  };

  const renderContactDrawerContent = (contact: Contact) => (
    <DrawerContent className="bg-black/90 border-purple-500/50 h-[100vh] overflow-y-auto">
      <div className="p-6 space-y-8 relative z-10">
        <DrawerClose asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 left-4 text-white hover:bg-purple-900/50"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </DrawerClose>

        <div className="flex items-start space-x-6 mt-8">
          <Avatar className="h-24 w-24 bg-purple-900/50 border-2 border-purple-500/50">
            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">{contact.name}</h2>
            {contact.phone && (
              <p className="text-white">{contact.phone}</p>
            )}
            {contact.email && (
              <p className="text-white">{contact.email}</p>
            )}
            <p className="text-sm text-white">
              Orbit Distance: {((1 - (contact.closeness || 0)) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Groups</h3>
          <ContactGroupsManager contactId={contact.id} className="text-white" />
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">
            You and {contact.name.split(' ')[0]}
          </h3>
          
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-lg p-4 space-y-4 relative">
            <div className="absolute inset-0 bg-black/40 rounded-lg" />
            <div className="space-y-2 relative">
              <h4 className="text-lg font-medium text-white">Last Hangout</h4>
              <div className="aspect-video bg-purple-800/30 rounded-lg flex items-center justify-center relative">
                <p className="text-white font-medium relative">Add a photo</p>
              </div>
              <p className="text-white font-medium relative">
                {contact.meeting_story || "Add a quick note about your last hangout"}
              </p>
            </div>

            {contact.relationship && (
              <div className="relative">
                <h4 className="text-lg font-medium text-white mb-2">Known Since</h4>
                <p className="text-white relative">{contact.relationship}</p>
              </div>
            )}

            <div className="relative">
              <h4 className="text-lg font-medium text-white mb-4">Highlights of your friendship</h4>
              <div className="relative">
                <div className="aspect-video bg-purple-800/30 rounded-lg flex items-center justify-center">
                  <p className="text-white font-medium relative">Add photos to your friendship timeline</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <h4 className="text-lg font-medium text-white mb-2">Your Story</h4>
              <p className="text-white font-medium relative">
                {contact.meeting_story || "Add a description of how you met and your journey together"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DrawerContent>
  );

  const renderContactAvatar = (contact: Contact, x: number, y: number, isAnimating: boolean = false) => (
    <Drawer key={contact.id}>
      <DrawerTrigger asChild>
        <button
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-500 ${
            isAnimating ? 'animate-fade-in' : ''
          }`}
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
          }}
        >
          <div className="relative">
            <Avatar className="h-16 w-16 bg-purple-900/50 border-2 border-purple-500/50 hover:border-purple-400">
              <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
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
      {renderContactDrawerContent(contact)}
    </Drawer>
  );

  const renderHomeView = () => {
    const innerOrbitContacts = getInnerOrbitContacts();
    const userGroups = getUserCreatedGroups();

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse" />
          <AvatarUpload
            url={profileData?.avatar_url ?? undefined}
            onUploadComplete={(url) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
            fallback={getInitials(profileData?.display_name || 'U')}
            size="lg"
          />
        </div>

        {innerOrbitContacts.map((contact, index) => {
          const angle = (index * 2 * Math.PI) / innerOrbitContacts.length;
          const radius = 120;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return renderContactAvatar(contact, x, y);
        })}

        {userGroups.map((group, groupIndex) => {
          const groupContacts = getContactsForGroup(group.name);
          const groupAngle = (groupIndex * 2 * Math.PI) / userGroups.length;
          const groupRadius = 280;
          const groupX = Math.cos(groupAngle) * groupRadius;
          const groupY = Math.sin(groupAngle) * groupRadius;

          return (
            <div
              key={group.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `calc(50% + ${groupX}px)`,
                top: `calc(50% + ${groupY}px)`,
              }}
            >
              <div className="relative">
                <Badge
                  variant="outline"
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 cursor-pointer hover:bg-purple-800/50 bg-purple-900/50 border-purple-500/50 text-purple-100"
                  onClick={() => setSelectedGroup(group.name)}
                >
                  {group.emoji} {group.name}
                </Badge>
                <div className="relative grid grid-cols-2 gap-2">
                  {groupContacts.slice(0, 4).map((contact, contactIndex) => {
                    const size = contactIndex === 0 ? 'h-12 w-12' : 'h-8 w-8';
                    return (
                      <Drawer key={contact.id}>
                        <DrawerTrigger asChild>
                          <button className="transform hover:scale-110 transition-transform">
                            <Avatar className={`${size} bg-purple-900/50 border-2 border-purple-500/50 hover:border-purple-400`}>
                              <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                            </Avatar>
                          </button>
                        </DrawerTrigger>
                        {renderContactDrawerContent(contact)}
                      </Drawer>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGroupView = () => {
    const groupContacts = getContactsForGroup(selectedGroup);
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse" />
          <AvatarUpload
            url={profileData?.avatar_url ?? undefined}
            onUploadComplete={(url) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
            fallback={getInitials(profileData?.display_name || 'U')}
            size="lg"
          />
        </div>

        {groupContacts.map((contact, index) => {
          const angle = (index * 2 * Math.PI) / groupContacts.length;
          const radius = 140;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return renderContactAvatar(contact, x, y, true);
        })}
      </div>
    );
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
      <div className="fixed inset-0">
        <div className="fixed inset-0 flex items-center justify-center z-[9999] mt-32">
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg shadow-lg max-w-md text-center space-y-6">
            <p className="text-lg text-white">
              Your relationships are a beautiful constellation, but it's looking a bit empty right now.
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
        
        <div className="fixed inset-0 overflow-hidden">
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
                {selectedGroup === "Home" ? renderHomeView() : renderGroupView()}
              </div>

              <div className="space-y-2 mb-16">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Contact Groups</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50 -mt-0.5"
                    onClick={() => setIsGroupDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
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
            {selectedGroup === "Home" ? renderHomeView() : renderGroupView()}
          </div>

          <div className="space-y-2 mb-16">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-white">Contact Groups</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50 -mt-0.5"
                onClick={() => setIsGroupDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
    </div>
  );
};

export default ContactsView;