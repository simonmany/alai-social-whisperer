<lov-code>
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronUp, Plus, ArrowLeft, Trash, Smile, Pencil } from "lucide-react";
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
import { DeepSpaceView } from "@/components/DeepSpaceView";
import { Contact } from "@/types/contacts";
import { ContactCard } from "@/components/ContactCard";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

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

const getContactGradient = (contactId: string) => {
  const gradients = [
    'linear-gradient(225deg, #FFE29F 0%, #FFA99F 48%, #FF719A 100%)',
    'linear-gradient(90deg, hsla(221, 45%, 73%, 1) 0%, hsla(220, 78%, 29%, 1) 100%)',
    'linear-gradient(90deg, hsla(24, 100%, 83%, 1) 0%, hsla(341, 91%, 68%, 1) 100%)',
    'linear-gradient(90deg, hsla(29, 92%, 70%, 1) 0%, hsla(0, 87%, 73%, 1) 100%)',
    'linear-gradient(102.3deg, rgba(147,39,143,1) 5.9%, rgba(234,172,232,1) 64%, rgba(246,219,245,1) 89%)',
  ];
  const index = parseInt(contactId.slice(-3), 16) % gradients.length;
  return gradients[index];
};

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
  const [showDeepSpace, setShowDeepSpace] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
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
      
      let allContacts: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000; // Supabase's maximum page size
      
      while (hasMore) {
        const { data, error, count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id)
          .order('closeness', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching contacts:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allContacts = [...allContacts, ...data];
          if (count && allContacts.length >= count) {
            hasMore = false;
          }
          page++;
        }
      }
      
      console.log('Total contacts fetched:', allContacts.length);
      return allContacts as Contact[];
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

      console.log('Fetching contact groups for user:', session.user.id); // Debug log
      
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      const defaultGroups = [
        { id: 'home', name: 'Home', emoji: '🏠' },
        { id: 'inner-orbit', name: 'Inner Orbit', emoji: '✨' }
      ];
      
      console.log('Fetched groups:', data); // Debug log
      return [...defaultGroups, ...data] as Group[];
    },
    enabled: !!session?.user?.id
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
    
    let groupContacts: Contact[] = [];
    
    if (groupName === "Inner Orbit") {
      groupContacts = getInnerOrbitContacts();
    } else if (groupName === "Home") {
      groupContacts = contacts;
    } else {
      const selectedGroupData = groups.find(g => g.name === groupName);
      console.log('Selected group data:', selectedGroupData);
      
      if (!selectedGroupData) return [];
      
      groupContacts = contacts.filter(contact => 
        groupMemberships.some(m => 
          m.contact_id === contact.id && m.group_id === selectedGroupData.id
        )
      );
    }
    
    // Apply search filter to the group contacts
    return groupContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderContactDrawerContent = (contact: Contact) => (
    <DrawerContent className="bg-black/90 border-purple-500/50 h-[100vh] overflow-y-auto">
      <div className="p-6 space-y-8 relative z-10">
        <DrawerClose asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 left-4 text-white hover:bg-purple-900/50"
            aria-label="Close drawer"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </DrawerClose>

        <ContactCard {...contact} />
      </div>
    </DrawerContent>
  );

  const renderHomeView = () => {
    // If there's a search query, show filtered results in grid view
    if (searchQuery) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredContacts.map((contact) => (
            <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button className="w-full">
                  <div className="group relative flex flex-col items-center">
                    <div 
                      className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: getContactGradient(contact.id),
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmoji(contact.id) && (
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-lg backdrop-blur-sm">
                        {getContactEmoji(contact.id)}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>
          ))}
        </div>
      );
    }

    // Original orbital view for no search query
    const innerOrbitContacts = getInnerOrbitContacts();
    const userGroups = getUserCreatedGroups();
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central user avatar */}
        <div className="relative z-10">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
          <div className="relative">
            <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-pulse"></div>
            <div className="absolute -inset-2 bg-orange-400/30 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <AvatarUpload
              url={profileData?.avatar_url ?? undefined}
              onUploadComplete={(url) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
              fallback={getInitials(profileData?.display_name || 'U')}
              size="lg"
              className="relative z-10 border-2 border-orange-400/50 shadow-lg shadow-orange-500/30"
            />
          </div>
        </div>

        {/* Inner orbit contacts */}
        {innerOrbitContacts.map((contact, index) => {
          const angle = (index * 2 * Math.PI) / innerOrbitContacts.length;
          const radius = 120; // Smaller radius for inner orbit
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <div className="relative group">
                    <div 
                      className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: getContactGradient(contact.id),
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmoji(contact.id) && (
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-lg backdrop-blur-sm">
                        {getContactEmoji(contact.id)}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>
          );
        })}

        {/* Outer orbit groups */}
        {userGroups.map((group, index) => {
          const angle = (index * 2 * Math.PI) / userGroups.length;
          const radius = 280; // Larger radius for groups orbit
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          // Get contacts for this group
          const groupContacts = getContactsForGroup(group.name);

          return (
            <button
              key={group.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
              onClick={() => setSelectedGroup(group.name)}
            >
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-purple-900/50 border border-purple-500/50 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-900/50 rounded-full"></div>
                  <span className="text-white font-semibold relative z-10">
                    {group.emoji} {group.name}
                  </span>
                </div>
                <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {groupContacts.length} contacts
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderGroupView = () => {
    const groupContacts = getContactsForGroup(selectedGroup);
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central user avatar */}
        <div className="relative z-10">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
          <div className="relative">
            <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-pulse"></div>
            <div className="absolute -inset-2 bg-orange-400/30 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <AvatarUpload
              url={profileData?.avatar_url ?? undefined}
              onUploadComplete={(url) => queryClient.invalidateQueries({ queryKey: ['profile'] })}
              fallback={getInitials(profileData?.display_name || 'U')}
              size="lg"
              className="relative z-10 border-2 border-orange-400/50 shadow-lg shadow-orange-500/30"
            />
          </div>
        </div>

        {/* Group contacts in orbit */}
        {groupContacts.map((contact, index) => {
          const angle = (index * 2 * Math.PI) / groupContacts.length;
          const radius = 180; // Slightly larger than inner orbit but smaller than group orbit
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <div className="relative group">
                    <div 
                      className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: getContactGradient(contact.id),
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmoji(contact.id) && (
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-lg backdrop-blur-sm">
                        {getContactEmoji(contact.id)}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>
          );
        })}
      </div>
    );
  };

  const isDefaultGroup = selectedGroup === "Home" || selectedGroup === "Inner Orbit" || selectedGroup === "Deep Space";

  const renderGroupHeader = () => {
    if (selectedGroup === "Home" || selectedGroup === "Inner Orbit" || selectedGroup === "Deep Space") {
      return null;
    }

    const groupData = groups.find(g => g.name === selectedGroup);
    console.log('Group data for header:', { selectedGroup, groupData });

    if (!groupData) return null;

    return (
      <div className="flex items-center justify-center gap-2 mb-8 relative z-50">
        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className="text-4xl hover:opacity-80 transition-opacity p-0 h-auto"
              onClick={() => setIsEmojiPickerOpen(true)}
            >
              {groupData.emoji || "👥"}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 w-[352px] border-purple-500/50" 
            side="bottom" 
            align="center"
          >
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
            />
          </PopoverContent>
        </Popover>
        
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-white">
            {groupData.name}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/70 hover:text-white hover:bg-purple-900/50"
            onClick={() => {
              setEditedGroupName(groupData.name);
              setIsEditingGroupName(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const handleDeleteGroup = async () => {
    const groupToDelete = groups.find(g => g.name === selectedGroup);
    if (!groupToDelete) return;

    try {
      // Delete all group memberships first
      const { error: membershipError } = await supabase
        .from('contact_group_memberships')
        .delete()
        .eq('group_id', groupToDelete.id);

      if (membershipError) throw membershipError;

      // Then delete the group itself
      const { error: groupError } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupToDelete.id);

      if (groupError) throw groupError;

      toast({
        title: "Group deleted",
        description: "The group and all its memberships have been removed.",
      });

      // Reset view to Home and refresh data
      setSelectedGroup("Home");
      queryClient.invalidateQueries({ queryKey: ['contact_groups'] });
      queryClient.invalidateQueries({ queryKey: ['group_memberships'] });
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete the group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  const handleEmojiSelect = async (emoji: any) => { // Changed type to any to see full emoji object
    console.log('Raw emoji object:', emoji); // Debug full emoji object
    
    const selectedGroupData = groups.find(g => g.name === selectedGroup);
    if (!selectedGroupData || selectedGroupData.id === 'home' || selectedGroupData.id === 'inner-orbit') {
      console.log('Invalid group selection:', { selectedGroup, selectedGroupData });
      return;
    }

    console.log('Updating emoji for group:', {
      groupId: selectedGroupData.id,
      groupName: selectedGroupData.name,
      newEmoji: emoji.native || emoji.unified
    });

    try {
      // We'll use the native emoji character or the unified code
      const emojiToUse = emoji.native || emoji.unified;
      
      const { data, error } = await supabase
        .from('contact_groups')
        .update({ emoji: emojiToUse })
        .eq('id', selectedGroupData.id)
        .select(); // Add select() to get back the updated record

      if (error) throw error;

      console.log('Supabase update response:', data); // Debug log

      // Force an immediate refetch
      await queryClient.invalidateQueries({ 
        queryKey: ['contact_groups', session?.user?.id],
        exact: true 
      });
      
      toast({
        title: "Success",
        description: "Group emoji updated successfully",
      });

      setIsEmojiPickerOpen(false);
    } catch (error: any) {
      console.error('Error updating group emoji:', error);
      toast({
        title: "Error",
        description: "Failed to update group emoji",
        variant: "destructive",
      });
    }
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

  if (showDeepSpace) {
    return (
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ 
            backgroundImage: 'url("/lovable-uploads/2d5625f4-eacc-494d-b391-4d338902ebb4.png")',
            backgroundSize: 'cover'
          }}>
          <div className="absolute inset-0 bg-black bg-opacity-50" />
        </div>

        <div className="container mx-auto p-4 relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <Button
              variant="ghost"
              className="text-white hover:bg-purple-900/50"
              onClick={() => setShowDeepSpace(false)}
            >
              ← Back to Orbit View
            </Button>
            <h2 className="text-2xl font-bold text-white">Deep Space</h2>
          </div>
          
          <div className="flex-1 overflow-auto">
            <DeepSpaceView contacts={contacts} />
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 pb-16 z-20">
            <div className="container max-w-2xl mx-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Contact Groups</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50"
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
                      className={`cursor-pointer hover:bg-purple-800/50 text-sm ${
                        selectedGroup === group.name
                          ? "bg-purple-600"
                          : "bg-purple-900/50 border-purple-500/50 text-purple-100"
                      }`}
                      onClick={() => {
                        setSelectedGroup(group.name);
                        setShowDeepSpace(false);
                      }}
                    >
                      {group.emoji || "👥"} {group.name}
                    </Badge>
                  ))}
                  <Badge
                    variant="default"
                    className="cursor-pointer bg-purple-600 hover:bg-purple-800/50"
                  >
                    🌌 Deep Space
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white hover:bg-purple-900/50 z-30"
            onClick={() => navigate("/")}
          >
            <ChevronUp className="h-6 w-6" />
          </Button>
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
            {renderGroupHeader()}
            <div className="absolute inset-0 z-40">
              {selectedGroup === "Home" ? renderHomeView() : renderGroupView()}
            </div>
          </div>

          <div className="space-y
