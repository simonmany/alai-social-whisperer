import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronUp, ChevronDown, ChevronRight, Plus, ArrowLeft, Trash, Smile, ZoomIn, ZoomOut } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useToast } from "@/hooks/use-toast";
import GroupManagementDialog from "@/components/GroupManagementDialog";
import { useAuth } from "@/components/AuthProvider";
import { DeepSpaceView } from "@/components/DeepSpaceView";
import { Contact } from "@/types/contacts";
import { ContactCard } from "@/components/ContactCard";
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
  const gradients = ['linear-gradient(225deg, #FFE29F 0%, #FFA99F 48%, #FF719A 100%)', 'linear-gradient(90deg, hsla(221, 45%, 73%, 1) 0%, hsla(220, 78%, 29%, 1) 100%)', 'linear-gradient(90deg, hsla(24, 100%, 83%, 1) 0%, hsla(341, 91%, 68%, 1) 100%)', 'linear-gradient(90deg, hsla(29, 92%, 70%, 1) 0%, hsla(0, 87%, 73%, 1) 100%)', 'linear-gradient(102.3deg, rgba(147,39,143,1) 5.9%, rgba(234,172,232,1) 64%, rgba(246,219,245,1) 89%)'];
  const index = parseInt(contactId.slice(-3), 16) % gradients.length;
  return gradients[index];
};

const getInitials = (name: string): string => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

// Get the emoji from the contact's primary group
const getContactGroupEmoji = (contact: Contact, groupMemberships: GroupMembership[], groups: Group[]): string | null => {
  // Find all groups this contact belongs to
  const contactGroupIds = groupMemberships
    .filter(gm => gm.contact_id === contact.id)
    .map(gm => gm.group_id);
  
  // Filter out system groups and get user-created groups
  const userGroups = groups.filter(group => 
    contactGroupIds.includes(group.id) && 
    group.id !== 'home' && 
    group.id !== 'inner-orbit' && 
    !group.id.startsWith('system-')
  );
  
  // Return the first group's emoji if available
  return userGroups.length > 0 && userGroups[0].emoji ? userGroups[0].emoji : null;
};

const ContactsView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    // Try to get the last selected view from localStorage
    const savedView = localStorage.getItem('contactsSelectedView');
    // Default to "Laptop View" if nothing is saved
    return savedView || "Laptop View";
  });
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [showDeepSpace, setShowDeepSpace] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0); // 0 = innermost (Inner Orbit), 100 = outermost
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const {
    session
  } = useAuth();
  const {
    data: profileData
  } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const {
        data,
        error
      } = await supabase.from('profiles').select('onboarding_step, has_completed_tutorial, avatar_url, display_name').eq('id', session.user.id).single();
      if (error) throw error;
      console.log('Profile data in contacts view:', data);
      return data;
    },
    enabled: !!session?.user?.id
  });
  useEffect(() => {
    const updateTutorialStep = async () => {
      if (session?.user?.id && profileData?.onboarding_step === 'contactsintro' && !profileData?.has_completed_tutorial) {
        console.log('ContactsView mounted during tutorial, updating step to contactsopen');
        try {
          const {
            error
          } = await supabase.from('profiles').update({
            onboarding_step: 'contactsopen'
          }).eq('id', session.user.id);
          if (error) {
            console.error('Error updating tutorial step in ContactsView:', error);
          } else {
            console.log('Successfully updated tutorial step to contactsopen in ContactsView');
            queryClient.invalidateQueries({
              queryKey: ['profile', session.user.id]
            });
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
      await supabase.from('profiles').update({
        onboarding_step: 'calendarintro'
      }).eq('id', session.user.id);
      navigate('/');
    } catch (error: any) {
      console.error('Error updating tutorial progress:', error);
      toast({
        title: "Error updating tutorial progress",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const {
    data: contacts = [],
    isLoading: isLoadingContacts,
    error: contactsError
  } = useQuery({
    queryKey: ['contacts', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      console.log('Fetching contacts for user:', session.user.id);
      let allContacts: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000; // Supabase's maximum page size

      while (hasMore) {
        const {
          data,
          error,
          count
        } = await supabase.from('contacts').select('*', {
          count: 'exact'
        }).eq('user_id', session.user.id).order('closeness', {
          ascending: false
        }).range(page * pageSize, (page + 1) * pageSize - 1);
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
    enabled: !!session?.user?.id
  });
  const filteredContacts = contacts.filter(contact => contact.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const {
    data: groups = [],
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ['contact_groups', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      console.log('Fetching contact groups for user:', session.user.id); // Debug log

      const {
        data,
        error
      } = await supabase.from('contact_groups').select('*').eq('user_id', session.user.id);
      if (error) throw error;
      const defaultGroups = [{
        id: 'home',
        name: 'Home',
        emoji: '🏠'
      }, {
        id: 'inner-orbit',
        name: 'Inner Orbit',
        emoji: '✨'
      }];
      console.log('Fetched groups:', data); // Debug log
      return [...defaultGroups, ...data] as Group[];
    },
    enabled: !!session?.user?.id
  });
  const {
    data: groupMemberships = []
  } = useQuery<GroupMembership[]>({
    queryKey: ['group_memberships', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const {
        data,
        error
      } = await supabase.from('contact_group_memberships').select('*');
      if (error) throw error;
      return data as GroupMembership[];
    },
    enabled: !!session?.user?.id
  });
  const getContactGroups = (contactId: string) => {
    const membershipIds = groupMemberships.filter(m => m.contact_id === contactId).map(m => m.group_id);
    return groups.filter(g => membershipIds.includes(g.id));
  };
  const getContactEmojis = (contactId: string): Array<{emoji: string, groupId: string}> => {
    const contactGroups = getContactGroups(contactId);
    if (contactGroups.length === 0) return [];
    
    return contactGroups.map(group => ({
      emoji: group.emoji || group.name.charAt(0),
      groupId: group.id
    }));
  };
  
  // Update localStorage whenever the selected view changes
  useEffect(() => {
    localStorage.setItem('contactsSelectedView', selectedGroup);
  }, [selectedGroup]);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactDrawerOpen(true);
  };
  const getInnerOrbitContacts = () => {
    return [...contacts].sort((a, b) => (b.closeness || 0) - (a.closeness || 0)).slice(0, 6);
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
      groupContacts = contacts.filter(contact => groupMemberships.some(m => m.contact_id === contact.id && m.group_id === selectedGroupData.id));
    }

    // Apply search filter to the group contacts
    return groupContacts.filter(contact => contact.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };
  const renderContactDrawerContent = (contact: Contact) => {
    return (
      <DrawerContent className="bg-black/90 border-purple-500/50 h-[100vh] overflow-y-auto">
        <div className="p-6 space-y-8 relative z-10">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white hover:bg-purple-900/50" aria-label="Close drawer">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </DrawerClose>

          <ContactCard {...contact} />
        </div>
      </DrawerContent>
    );
  };

  // Calculate average closeness for each group based on its members
  const calculateGroupCloseness = (groupId: string) => {
    const memberships = groupMemberships.filter(gm => gm.group_id === groupId);
    if (memberships.length === 0) return 0;
    
    let totalCloseness = 0;
    let contactsWithCloseness = 0;
    
    memberships.forEach(membership => {
      const contact = contacts.find(c => c.id === membership.contact_id);
      if (contact && typeof contact.closeness === 'number') {
        totalCloseness += contact.closeness;
        contactsWithCloseness++;
      }
    });
    
    return contactsWithCloseness > 0 ? totalCloseness / contactsWithCloseness : 0;
  };
  
  const renderConstellationsView = () => {
    // Filter out system groups and get user-created groups
    const userGroups = groups.filter(group => 
      group.id !== 'home' && 
      group.id !== 'inner-orbit' && 
      !group.id.startsWith('system-')
    );
    
    // Calculate closeness for each group and sort
    const groupsWithCloseness = userGroups.map(group => ({
      ...group,
      closeness: calculateGroupCloseness(group.id),
      memberCount: groupMemberships.filter(gm => gm.group_id === group.id).length
    }));
    
    // Sort groups by closeness
    const sortedGroups = [...groupsWithCloseness].sort((a, b) => b.closeness - a.closeness);
    
    // Divide groups into three orbital rings
    const innerOrbitGroups = sortedGroups.slice(0, 3); // 3 closest groups
    const middleOrbitGroups = sortedGroups.slice(3, 9); // Next 6 groups
    const outerOrbitGroups = sortedGroups.slice(9); // All remaining groups
    
    // Calculate which orbits to show based on zoom level
    const showInnerOrbit = true; // Always show inner orbit
    const showMiddleOrbit = true; // Always show middle orbit
    const showOuterOrbit = true; // Always show outer orbit
    
    // Calculate orbit radii based on zoom level
    // Base values represent the minimum distances when fully zoomed out
    const baseInnerRadius = 80;
    const baseMiddleRadius = 160;
    const baseOuterRadius = 240;
    
    // Reverse the zoom level to match the expected behavior
    // When slider shows "zoomed in" (100), groups should be closest to center
    // When slider shows "zoomed out" (0), groups should be farthest from center
    const reversedZoomLevel = 100 - zoomLevel;
    
    // Zoom factor: larger when slider shows "zoomed out" (0), smaller when slider shows "zoomed in" (100)
    const zoomFactor = 0.5 + (reversedZoomLevel / 50); // 0.5 at zoom=100, 2.5 at zoom=0
    
    const innerRadius = baseInnerRadius * zoomFactor;
    const middleRadius = baseMiddleRadius * zoomFactor;
    const outerRadius = baseOuterRadius * zoomFactor;
    
    // Function to position a group on an orbit
    const positionOnOrbit = (index: number, total: number, radius: number) => {
      const angle = (index / total) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return { x, y };
    };
    
    // Function to render a group node
    const renderGroupNode = (group: any, position: { x: number, y: number }) => {
      const displayEmoji = group.emoji || '👥';
      const displayText = !group.emoji ? getInitials(group.name) : '';
      
      // Base size on member count and adjust for zoom level
      // When slider shows "zoomed in" (100), groups are closer to center so should appear larger
      // When slider shows "zoomed out" (0), groups are farther from center so should appear smaller
      const zoomSizeFactor = 0.8 + (zoomLevel / 200); // 0.8 at zoom=0, 1.3 at zoom=100
      const baseSize = 40 + Math.min(group.memberCount * 2, 20);
      const groupSize = Math.round(baseSize * zoomSizeFactor); // Size based on member count and zoom
      
      return (
        <div 
          key={group.id}
          className="absolute flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 ease-in-out"
          style={{
            width: `${groupSize}px`,
            height: `${groupSize}px`,
            left: `calc(50% + ${position.x}px - ${groupSize/2}px)`,
            top: `calc(50% + ${position.y}px - ${groupSize/2}px)`,
            background: `radial-gradient(circle at center, rgba(147, 51, 234, 0.7), rgba(76, 29, 149, 0.5))`,
            border: '1px solid rgba(147, 51, 234, 0.5)',
            fontSize: `${Math.max(16, Math.min(24, groupSize/2))}px`,
            zIndex: 10
          }}
          onClick={() => setSelectedGroup(group.name)}
        >
          {displayEmoji || displayText || '?'}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 text-white whitespace-nowrap transition-all duration-300"
            style={{
              bottom: `-${Math.max(6, Math.min(10, groupSize/5))}px`,
              fontSize: `${Math.max(10, Math.min(14, groupSize/4))}px`,
              opacity: zoomLevel >= 50 ? 1 : 0.7, // More visible when zoomed in (closer to center)
              textShadow: '0 0 4px rgba(0,0,0,0.7)', // Add shadow for better visibility
              fontWeight: 'medium'
            }}
          >
            {group.name}
          </div>
        </div>
      );
    };
    
    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Center user node */}
        <div 
          className="absolute rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white overflow-hidden"
          style={{
            width: '60px',
            height: '60px',
            left: 'calc(50% - 30px)',
            top: 'calc(50% - 30px)',
            zIndex: 20,
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)'
          }}
        >
          {profileData?.avatar_url ? (
            <img 
              src={profileData.avatar_url} 
              alt="Your profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span>You</span>
          )}
        </div>
        
        {/* Orbit rings */}
        {showInnerOrbit && (
          <div 
            className="absolute rounded-full border border-purple-500/30"
            style={{
              width: `${innerRadius * 2}px`,
              height: `${innerRadius * 2}px`,
              left: `calc(50% - ${innerRadius}px)`,
              top: `calc(50% - ${innerRadius}px)`,
            }}
          />
        )}
        
        {showMiddleOrbit && (
          <div 
            className="absolute rounded-full border border-purple-500/20"
            style={{
              width: `${middleRadius * 2}px`,
              height: `${middleRadius * 2}px`,
              left: `calc(50% - ${middleRadius}px)`,
              top: `calc(50% - ${middleRadius}px)`,
            }}
          />
        )}
        
        {showOuterOrbit && (
          <div 
            className="absolute rounded-full border border-purple-500/10"
            style={{
              width: `${outerRadius * 2}px`,
              height: `${outerRadius * 2}px`,
              left: `calc(50% - ${outerRadius}px)`,
              top: `calc(50% - ${outerRadius}px)`,
            }}
          />
        )}
        
        {/* Inner orbit groups */}
        {showInnerOrbit && innerOrbitGroups.map((group, index) => {
          const position = positionOnOrbit(index, Math.max(innerOrbitGroups.length, 1), innerRadius);
          return renderGroupNode(group, position);
        })}
        
        {/* Middle orbit groups */}
        {showMiddleOrbit && middleOrbitGroups.map((group, index) => {
          const position = positionOnOrbit(index, Math.max(middleOrbitGroups.length, 1), middleRadius);
          return renderGroupNode(group, position);
        })}
        
        {/* Outer orbit groups */}
        {showOuterOrbit && outerOrbitGroups.map((group, index) => {
          const position = positionOnOrbit(index, Math.max(outerOrbitGroups.length, 1), outerRadius);
          return renderGroupNode(group, position);
        })}
        
        {/* Zoom controls */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 bg-black/30 p-2 rounded-full">
          <button 
            className="p-2 rounded-full bg-purple-900/70 hover:bg-purple-800 text-white"
            onClick={() => setZoomLevel(Math.max(0, zoomLevel - 10))}
          >
            <ZoomIn size={16} />
          </button>
          
          <input
            type="range"
            min="0"
            max="100"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-6 h-24 appearance-none bg-purple-900/50 rounded-full overflow-hidden transform rotate-180"
            style={{
              writingMode: 'bt-lr', /* IE */
              WebkitAppearance: 'slider-vertical', /* WebKit */
              padding: '0 5px',
            }}
          />
          
          <button 
            className="p-2 rounded-full bg-purple-900/70 hover:bg-purple-800 text-white"
            onClick={() => setZoomLevel(Math.min(100, zoomLevel + 10))}
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderOrbitsView = () => {
    // Filter contacts that are in at least one group and not archived
    const activeContacts = contacts.filter(contact => {
      const contactGroups = groupMemberships.filter(gm => gm.contact_id === contact.id);
      return contactGroups.length > 0 && !contact.is_archived;
    });

    // Sort contacts by closeness (using the same logic as Inner Orbit group)
    const sortedContacts = [...activeContacts].sort((a, b) => (b.closeness || 0) - (a.closeness || 0));

    // Divide contacts into three orbital rings
    const innerOrbitContacts = sortedContacts.slice(0, 6); // 6 closest contacts
    const middleOrbitContacts = sortedContacts.slice(6, 18); // Next 12 contacts
    const outerOrbitContacts = sortedContacts.slice(18); // All remaining contacts

    // Calculate which orbits to show based on zoom level
    // When slider shows "zoomed in" (100), show all orbits (contacts closer to center)
    // When slider shows "zoomed out" (0), show fewer orbits (contacts farther from center)
    const showInnerOrbit = true; // Always show inner orbit
    const showMiddleOrbit = zoomLevel >= 30;
    const showOuterOrbit = zoomLevel >= 70;

    // Calculate orbit radii based on zoom level
    const baseInnerRadius = 120;
    const baseMiddleRadius = 220;
    const baseOuterRadius = 320;
    
    // Reverse the zoom level to match the expected behavior
    const reversedZoomLevel = 100 - zoomLevel;
    
    // Zoom factor: larger when slider shows "zoomed out" (0), smaller when slider shows "zoomed in" (100)
    const zoomFactor = 0.5 + (reversedZoomLevel / 50); // 0.5 at zoom=100, 2.5 at zoom=0
    
    const innerRadius = baseInnerRadius * zoomFactor;
    const middleRadius = baseMiddleRadius * zoomFactor;
    const outerRadius = baseOuterRadius * zoomFactor;

    // Function to position a contact on an orbit
    const positionOnOrbit = (index: number, total: number, radius: number) => {
      const angle = (index / total) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return { x, y };
    };

    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Zoom slider - vertical on right side */}
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 z-50 h-64 flex flex-col items-center justify-between">
          <div className="text-purple-300 mb-2 bg-black/30 p-2 rounded-full hover:bg-black/50 cursor-pointer" onClick={() => setZoomLevel(Math.max(0, zoomLevel - 10))}>
            <ZoomIn className="h-5 w-5" />
          </div>
          <div className="relative h-40 bg-black/30 rounded-full px-2 py-4">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={zoomLevel} 
              onChange={(e) => setZoomLevel(parseInt(e.target.value))} 
              className="accent-purple-500 h-32"
              style={{ 
                WebkitAppearance: "slider-vertical",
                writingMode: "bt-lr",
                MozAppearance: "slider-vertical",
                width: "8px"
              }}
            />
          </div>
          <div className="text-purple-300 mt-2 bg-black/30 p-2 rounded-full hover:bg-black/50 cursor-pointer" onClick={() => setZoomLevel(Math.min(100, zoomLevel + 10))}>
            <ZoomOut className="h-5 w-5" />
          </div>
        </div>

        {/* Orbits visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* User at center */}
          <div className="absolute z-40 rounded-full bg-purple-600 w-16 h-16 flex items-center justify-center">
            {profileData?.avatar_url ? (
              <img 
                src={profileData.avatar_url} 
                alt="User" 
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="text-2xl">👤</div>
            )}
          </div>

          {/* Orbit rings */}
          {showInnerOrbit && (
            <div 
              className="absolute rounded-full border border-purple-500/40" 
              style={{ width: innerRadius * 2, height: innerRadius * 2 }}
            />
          )}
          
          {showMiddleOrbit && (
            <div 
              className="absolute rounded-full border border-purple-400/30" 
              style={{ width: middleRadius * 2, height: middleRadius * 2 }}
            />
          )}
          
          {showOuterOrbit && (
            <div 
              className="absolute rounded-full border border-purple-300/20" 
              style={{ width: outerRadius * 2, height: outerRadius * 2 }}
            />
          )}

          {/* Inner orbit contacts */}
          {showInnerOrbit && innerOrbitContacts.map((contact, index) => {
            const position = positionOnOrbit(index, innerOrbitContacts.length || 1, innerRadius);
            return (
              <div 
                key={contact.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-300"
                style={{ 
                  left: `calc(50% + ${position.x}px)`, 
                  top: `calc(50% + ${position.y}px)`,
                }}
                onClick={() => handleContactClick(contact)}
              >
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shadow-lg"
                    style={{ background: getContactGradient(contact.id) }}
                  >
                    {contact.first_name && contact.last_name ? 
                      `${contact.first_name[0]}${contact.last_name[0]}` : 
                      (contact.name ? getInitials(contact.name) : '?')}
                  </div>
                  
                  {/* Group emojis surrounding the contact bubble */}
                  {getContactEmojis(contact.id).length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {getContactEmojis(contact.id).map((item, index, arr) => {
                        // Calculate position in a circle around the contact bubble
                        const totalItems = arr.length;
                        const angle = (index / totalItems) * 2 * Math.PI;
                        const radius = 20; // Distance from center of contact bubble
                        
                        // Calculate x and y coordinates
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        
                        return (
                          <div 
                            key={item.groupId}
                            className="absolute h-5 w-5 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-xs backdrop-blur-sm text-white"
                            style={{ 
                              transform: `translate(${x}px, ${y}px)`,
                              top: '50%',
                              left: '50%',
                              marginTop: '-10px',
                              marginLeft: '-10px',
                              zIndex: 40
                            }}
                          >
                            {item.emoji}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white text-center whitespace-nowrap">
                  {contact.first_name} {contact.last_name}
                </div>
              </div>
            );
          })}

          {/* Middle orbit contacts */}
          {showMiddleOrbit && middleOrbitContacts.map((contact, index) => {
            const position = positionOnOrbit(index, middleOrbitContacts.length || 1, middleRadius);
            return (
              <div 
                key={contact.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-all duration-300"
                style={{ 
                  left: `calc(50% + ${position.x}px)`, 
                  top: `calc(50% + ${position.y}px)`,
                }}
                onClick={() => handleContactClick(contact)}
              >
                <div className="relative">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-lg"
                    style={{ background: getContactGradient(contact.id) }}
                  >
                    {contact.first_name && contact.last_name ? 
                      `${contact.first_name[0]}${contact.last_name[0]}` : 
                      (contact.name ? getInitials(contact.name) : '?')}
                  </div>
                  
                  {/* Group emojis surrounding the contact bubble */}
                  {getContactEmojis(contact.id).length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {getContactEmojis(contact.id).map((item, index, arr) => {
                        // Calculate position in a circle around the contact bubble
                        const totalItems = arr.length;
                        const angle = (index / totalItems) * 2 * Math.PI;
                        const radius = 18; // Distance from center of contact bubble
                        
                        // Calculate x and y coordinates
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        
                        return (
                          <div 
                            key={item.groupId}
                            className="absolute h-4 w-4 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-[8px] backdrop-blur-sm text-white"
                            style={{ 
                              transform: `translate(${x}px, ${y}px)`,
                              top: '50%',
                              left: '50%',
                              marginTop: '-8px',
                              marginLeft: '-8px',
                              zIndex: 30
                            }}
                          >
                            {item.emoji}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {zoomLevel > 50 && (
                  <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-white/70 text-center whitespace-nowrap">
                    {contact.first_name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Outer orbit contacts */}
          {showOuterOrbit && outerOrbitContacts.map((contact, index) => {
            const position = positionOnOrbit(index, outerOrbitContacts.length || 1, outerRadius);
            return (
              <div 
                key={contact.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-300"
                style={{ 
                  left: `calc(50% + ${position.x}px)`, 
                  top: `calc(50% + ${position.y}px)`,
                }}
                onClick={() => handleContactClick(contact)}
              >
                <div className="relative">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-lg"
                    style={{ background: getContactGradient(contact.id) }}
                  >
                    {contact.first_name && contact.last_name ? 
                      `${contact.first_name[0]}${contact.last_name[0]}` : 
                      (contact.name ? getInitials(contact.name) : '?')}
                  </div>
                  
                  {/* Group emojis surrounding the contact bubble */}
                  {getContactEmojis(contact.id).length > 0 && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {getContactEmojis(contact.id).map((item, index, arr) => {
                        // Calculate position in a circle around the contact bubble
                        const totalItems = arr.length;
                        const angle = (index / totalItems) * 2 * Math.PI;
                        const radius = 14; // Distance from center of contact bubble
                        
                        // Calculate x and y coordinates
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        
                        return (
                          <div 
                            key={item.groupId}
                            className="absolute h-3 w-3 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-[6px] backdrop-blur-sm text-white"
                            style={{ 
                              transform: `translate(${x}px, ${y}px)`,
                              top: '50%',
                              left: '50%',
                              marginTop: '-6px',
                              marginLeft: '-6px',
                              zIndex: 20
                            }}
                          >
                            {item.emoji}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHomeView = () => {
    // If there's a search query, show filtered results in grid view
    if (searchQuery) {
      return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredContacts.map(contact => <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button className="w-full">
                  <div className="group relative flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden" style={{
                  background: getContactGradient(contact.id)
                }}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmojis(contact.id).length > 0 && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {getContactEmojis(contact.id).map((item, index, arr) => {
                          // Calculate position in a circle around the contact bubble
                          const totalItems = arr.length;
                          const angle = (index / totalItems) * 2 * Math.PI;
                          const radius = 28; // Distance from center of contact bubble (increased to place outside)
                          
                          // Calculate x and y coordinates
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;
                          
                          return (
                            <div 
                              key={item.groupId}
                              className="absolute h-6 w-6 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-xs backdrop-blur-sm text-white"
                              style={{ 
                                transform: `translate(${x}px, ${y}px)`,
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                                zIndex: 20
                              }}
                            >
                              {item.emoji}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>)}
        </div>;
    }

    // Original orbital view for no search query
    const innerOrbitContacts = getInnerOrbitContacts();
    const userGroups = getUserCreatedGroups();
    return <div className="absolute inset-0 flex items-center justify-center">
        {/* Central user avatar */}
        <div className="relative z-10">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
          <div className="relative">
            <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-pulse"></div>
            <div className="absolute -inset-2 bg-orange-400/30 rounded-full animate-pulse" style={{
            animationDelay: '150ms'
          }}></div>
            <AvatarUpload url={profileData?.avatar_url ?? undefined} onUploadComplete={url => queryClient.invalidateQueries({
            queryKey: ['profile']
          })} fallback={getInitials(profileData?.display_name || 'U')} size="lg" className="relative z-10 border-2 border-orange-400/50 shadow-lg shadow-orange-500/30" />
          </div>
        </div>

        {/* Inner orbit contacts */}
        {innerOrbitContacts.map((contact, index) => {
        const angle = index * 2 * Math.PI / innerOrbitContacts.length;
        const radius = 120; // Smaller radius for inner orbit
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300" style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`
            }}>
                  <div className="relative group">
                    <div className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden" style={{
                  background: getContactGradient(contact.id)
                }}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmojis(contact.id).length > 0 && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {getContactEmojis(contact.id).map((item, index, arr) => {
                          // Calculate position in a circle around the contact bubble
                          const totalItems = arr.length;
                          const angle = (index / totalItems) * 2 * Math.PI;
                          const radius = 28; // Distance from center of contact bubble (increased to place outside)
                          
                          // Calculate x and y coordinates
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;
                          
                          return (
                            <div 
                              key={item.groupId}
                              className="absolute h-6 w-6 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-xs backdrop-blur-sm text-white"
                              style={{ 
                                transform: `translate(${x}px, ${y}px)`,
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                                zIndex: 20
                              }}
                            >
                              {item.emoji}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>;
      })}

        {/* Outer orbit groups */}
        {userGroups.map((group, index) => {
        const angle = index * 2 * Math.PI / userGroups.length;
        const radius = 280; // Larger radius for groups orbit
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        // Get contacts for this group
        const groupContacts = getContactsForGroup(group.name);
        return <button key={group.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300" style={{
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y}px)`
        }} onClick={() => setSelectedGroup(group.name)}>
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
            </button>;
      })}
      </div>;
  };
  const renderGroupView = () => {
    const groupContacts = getContactsForGroup(selectedGroup);
    return <div className="absolute inset-0 flex items-center justify-center">
        {/* Central user avatar */}
        <div className="relative z-10">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
          <div className="relative">
            <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-pulse"></div>
            <div className="absolute -inset-2 bg-orange-400/30 rounded-full animate-pulse" style={{
            animationDelay: '150ms'
          }}></div>
            <AvatarUpload url={profileData?.avatar_url ?? undefined} onUploadComplete={url => queryClient.invalidateQueries({
            queryKey: ['profile']
          })} fallback={getInitials(profileData?.display_name || 'U')} size="lg" className="relative z-10 border-2 border-orange-400/50 shadow-lg shadow-orange-500/30" />
          </div>
        </div>

        {/* Group contacts in orbit */}
        {groupContacts.map((contact, index) => {
        const angle = index * 2 * Math.PI / groupContacts.length;
        const radius = 180; // Slightly larger than inner orbit but smaller than group orbit
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <button className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all duration-300" style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`
            }}>
                  <div className="relative group">
                    <div className="h-16 w-16 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden" style={{
                  background: getContactGradient(contact.id)
                }}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-sm z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    {getContactEmojis(contact.id).length > 0 && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        {getContactEmojis(contact.id).map((item, index, arr) => {
                          // Calculate position in a circle around the contact bubble
                          const totalItems = arr.length;
                          const angle = (index / totalItems) * 2 * Math.PI;
                          const radius = 28; // Distance from center of contact bubble (increased to place outside)
                          
                          // Calculate x and y coordinates
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;
                          
                          return (
                            <div 
                              key={item.groupId}
                              className="absolute h-6 w-6 rounded-full bg-purple-900/80 border border-purple-500/50 flex items-center justify-center text-xs backdrop-blur-sm text-white"
                              style={{ 
                                transform: `translate(${x}px, ${y}px)`,
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                                zIndex: 20
                              }}
                            >
                              {item.emoji}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="absolute top-full mt-2 text-xs text-white whitespace-nowrap left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </div>
                  </div>
                </button>
              </DrawerTrigger>
              {renderContactDrawerContent(contact)}
            </Drawer>;
      })}
      </div>;
  };
  const isDefaultGroup = selectedGroup === "Laptop View" || selectedGroup === "Orbits (People)" || selectedGroup === "Deep Space";
  const renderGroupHeader = () => {
    if (selectedGroup === "Laptop View" || selectedGroup === "Orbits (People)" || selectedGroup === "Deep Space") {
      return null;
    }
    const groupData = groups.find(g => g.name === selectedGroup);
    console.log('Group data for header:', {
      selectedGroup,
      groupData
    }); // Debug log

    if (!groupData) return null;
    return <div className="flex flex-col items-center justify-center gap-2 mb-8 relative z-50">
        <div className="w-full flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-purple-900/50 hover:bg-purple-800/70 text-white rounded-full flex items-center gap-1"
            onClick={() => setSelectedGroup("Laptop View")}
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div></div> {/* Empty div for flex justification */}
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative text-4xl p-0 h-auto"
                onClick={() => setIsEmojiPickerOpen(true)}
              >
                {groupData.emoji ? (
                  <div className="bg-purple-800/40 hover:bg-purple-800/60 transition-colors p-3 rounded-full">
                    {groupData.emoji}
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-purple-800/40 hover:bg-purple-800/60 transition-colors p-3 rounded-full w-14 h-14">
                    <Smile className="h-6 w-6 text-purple-200" />
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[352px] border-purple-500/50" side="bottom" align="center">
              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" previewPosition="none" skinTonePosition="none" />
            </PopoverContent>
          </Popover>
          <h2 className="text-2xl font-bold text-white">{selectedGroup}</h2>
        </div>
      </div>;
  };
  const handleDeleteGroup = async () => {
    console.log('Starting group deletion process for:', selectedGroup);
    
    // Find the group to delete
    const groupToDelete = groups.find(g => g.name === selectedGroup);
    
    if (!groupToDelete) {
      console.error('Group not found for deletion:', selectedGroup);
      toast({
        title: "Error",
        description: "Could not find the group to delete.",
        variant: "destructive"
      });
      setShowDeleteConfirmation(false);
      return;
    }
    
    console.log('Found group to delete:', groupToDelete);
    
    try {
      // Delete all group memberships first
      console.log('Deleting group memberships for group ID:', groupToDelete.id);
      const {
        data: deletedMemberships,
        error: membershipError
      } = await supabase
        .from('contact_group_memberships')
        .delete()
        .eq('group_id', groupToDelete.id)
        .select();
        
      if (membershipError) {
        console.error('Error deleting group memberships:', membershipError);
        throw membershipError;
      }
      
      console.log('Successfully deleted memberships:', deletedMemberships);

      // Then delete the group itself
      console.log('Deleting group with ID:', groupToDelete.id);
      const {
        data: deletedGroup,
        error: groupError
      } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupToDelete.id)
        .select();
        
      if (groupError) {
        console.error('Error deleting group:', groupError);
        throw groupError;
      }
      
      console.log('Successfully deleted group:', deletedGroup);
      
      toast({
        title: "Group deleted",
        description: "The group and all its memberships have been removed."
      });

      // Reset view to Home and refresh data
      setSelectedGroup("Laptop View");
      
      // Invalidate queries to refresh data
      console.log('Refreshing contact groups data');
      queryClient.invalidateQueries({
        queryKey: ['contact_groups']
      });
      queryClient.invalidateQueries({
        queryKey: ['group_memberships']
      });
    } catch (error: any) {
      console.error('Error in group deletion process:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete the group. Please try again.",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirmation(false);
    }
  };
  const handleEmojiSelect = async (emoji: any) => {
    // Changed type to any to see full emoji object
    console.log('Raw emoji object:', emoji); // Debug full emoji object

    const selectedGroupData = groups.find(g => g.name === selectedGroup);
    if (!selectedGroupData || selectedGroupData.id === 'home' || selectedGroupData.id === 'inner-orbit') {
      console.log('Invalid group selection:', {
        selectedGroup,
        selectedGroupData
      });
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
      const {
        data,
        error
      } = await supabase.from('contact_groups').update({
        emoji: emojiToUse
      }).eq('id', selectedGroupData.id).select(); // Add select() to get back the updated record

      if (error) throw error;
      console.log('Supabase update response:', data); // Debug log

      // Force an immediate refetch
      await queryClient.invalidateQueries({
        queryKey: ['contact_groups', session?.user?.id],
        exact: true
      });
      toast({
        title: "Success",
        description: "Group emoji updated successfully"
      });
      setIsEmojiPickerOpen(false);
    } catch (error: any) {
      console.error('Error updating group emoji:', error);
      toast({
        title: "Error",
        description: "Failed to update group emoji",
        variant: "destructive"
      });
    }
  };
  if (contactsError) {
    toast({
      title: "Error loading contacts",
      description: "There was a problem loading your contacts. Please try again.",
      variant: "destructive"
    });
  }
  if (isLoadingContacts || isLoadingGroups) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }
  if (showDeepSpace) {
    return <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: 'url("/lovable-uploads/2d5625f4-eacc-494d-b391-4d338902ebb4.png")',
        backgroundSize: 'cover'
      }}>
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      </div>

      <div className="container mx-auto p-4 relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" className="text-white hover:bg-purple-900/50" onClick={() => setShowDeepSpace(false)}>
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
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-6 text-white hover:bg-transparent hover:text-purple-300"
                    onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
                  >
                    {isGroupsExpanded ? 
                      <ChevronDown className="h-4 w-4 mr-1" /> : 
                      <ChevronRight className="h-4 w-4 mr-1" />
                    }
                  </Button>
                  <h3 className="text-lg font-semibold text-white">
                    Groups
                    <span className="ml-2 text-sm bg-purple-800 text-purple-100 px-2 py-0.5 rounded-full">
                      {/* Count only user-created groups (exclude default groups) */}
                      {groups.filter(g => !['Home', 'Inner Orbit'].includes(g.name)).length}
                    </span>
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50" 
                  onClick={() => setIsGroupDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {isGroupsExpanded && (
                <div className="flex flex-wrap gap-2">
                  {groups.map(group => <Badge key={group.id} variant={selectedGroup === group.name ? "default" : "outline"} className={`cursor-pointer hover:bg-purple-800/50 text-sm ${selectedGroup === group.name ? "bg-purple-600" : "bg-purple-900/50 border-purple-500/50 text-purple-100"}`} onClick={() => {
                  setSelectedGroup(group.name);
                  setShowDeepSpace(false);
                }}>
                    {group.emoji || <span className="text-purple-300 text-opacity-70 text-xs">✎</span>} {group.name}
                  </Badge>)}
                  <Badge variant="default" className="cursor-pointer bg-purple-600 hover:bg-purple-800/50">
                    🌌 Deep Space
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white hover:bg-purple-900/50 z-30" onClick={() => navigate("/")}>
          <ChevronUp className="h-6 w-6" />
        </Button>
      </div>

      <GroupManagementDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} contacts={contacts} onGroupCreated={() => {
      queryClient.invalidateQueries({
        queryKey: ['contact_groups']
      });
      queryClient.invalidateQueries({
        queryKey: ['group_memberships']
      });
    }} />
    </div>;
  }
  return <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: 'url("/lovable-uploads/2d5625f4-eacc-494d-b391-4d338902ebb4.png")',
      backgroundSize: 'cover'
    }}>
      <div className="absolute inset-0 bg-black bg-opacity-50" />
    </div>

    <div className="container max-w-2xl mx-auto p-4 h-full relative z-10">
      <div className="relative flex flex-col h-full">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-black/50 border-purple-500/50 text-white" />
        </div>

        <div className="flex flex-col gap-2 w-full mb-6">
          {/* Top row with Constellations, Orbits, and Deep Space */}
          <div className="flex flex-wrap gap-2 justify-center w-full">
            <Badge 
              variant={selectedGroup === "Constellations (Groups)" ? "default" : "outline"} 
              className={`flex-1 text-center justify-center cursor-pointer hover:bg-purple-800/50 text-sm ${selectedGroup === "Constellations (Groups)" ? "bg-purple-600" : "bg-purple-900/50 border-purple-400/50 text-purple-100 hover:border-purple-300/50"}`} 
              onClick={() => setSelectedGroup("Constellations (Groups)")}
            >
              ✨ Constellations (Groups)
            </Badge>
            <Badge 
              variant={selectedGroup === "Orbits (People)" ? "default" : "outline"} 
              className={`flex-1 text-center justify-center cursor-pointer hover:bg-purple-800/50 text-sm ${selectedGroup === "Orbits (People)" ? "bg-purple-600" : "bg-purple-900/50 border-purple-400/50 text-purple-100 hover:border-purple-300/50"}`} 
              onClick={() => setSelectedGroup("Orbits (People)")}
            >
              🌐 Orbits (People)
            </Badge>
            <Badge 
              variant="outline" 
              className="flex-1 text-center justify-center cursor-pointer hover:bg-purple-800/50 bg-purple-900/50 border-purple-400/50 text-purple-100 hover:border-purple-300/50 text-sm" 
              onClick={() => setShowDeepSpace(true)}
            >
              🌌 Deep Space
            </Badge>
          </div>
          
          {/* Bottom row with Laptop View */}
          <div className="flex justify-center w-full">
            <Badge 
              variant={selectedGroup === "Laptop View" ? "default" : "outline"} 
              className={`w-full text-center justify-center cursor-pointer hover:bg-purple-800/50 text-sm ${selectedGroup === "Laptop View" ? "bg-purple-600" : "bg-purple-900/50 border-purple-400/50 text-purple-100 hover:border-purple-300/50"}`} 
              onClick={() => setSelectedGroup("Laptop View")}
            >
              💻 Laptop View
            </Badge>
          </div>
        </div>

        <div className="flex-1 relative">
          {renderGroupHeader()}
          <div className="absolute inset-0 z-40">
            {selectedGroup === "Laptop View" ? renderHomeView() : 
             selectedGroup === "Orbits (People)" ? renderOrbitsView() : 
             selectedGroup === "Constellations (Groups)" ? renderConstellationsView() : 
             renderGroupView()}
          </div>
        </div>

        <div className="space-y-4 mb-16">
          {!isDefaultGroup && selectedGroup !== "Home" && selectedGroup !== "Constellations (Groups)" && <div className="flex justify-center mb-4">
              <Button variant="ghost" className="bg-red-900/50 border border-red-500/50 text-white hover:bg-red-800/50 flex items-center gap-2" onClick={() => setShowDeleteConfirmation(true)}>
                <Trash className="h-4 w-4" />
                Delete Group
              </Button>
            </div>}

          {/* Group navigation buttons moved to the top of the UI */}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-6 text-white hover:bg-transparent hover:text-purple-300"
                  onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
                >
                  {isGroupsExpanded ? 
                    <ChevronDown className="h-4 w-4 mr-1" /> : 
                    <ChevronRight className="h-4 w-4 mr-1" />
                  }
                </Button>
                <h3 className="text-lg font-semibold text-white">
                  Groups
                  <span className="ml-2 text-sm bg-purple-800 text-purple-100 px-2 py-0.5 rounded-full">
                    {groups.filter(g => !['Home', 'Inner Orbit'].includes(g.name)).length}
                  </span>
                </h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50" 
                onClick={() => setIsGroupDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isGroupsExpanded && (
              <div className="flex flex-wrap gap-2">
              {groups.map(group => <Badge key={group.id} variant={selectedGroup === group.name ? "default" : "outline"} className={`cursor-pointer hover:bg-purple-800/50 text-sm ${selectedGroup === group.name ? "bg-purple-600" : "bg-purple-900/50 border-purple-500/50 text-purple-100"}`} onClick={() => {
              setSelectedGroup(group.name);
            }}>
                {group.emoji || <span className="text-purple-300 text-opacity-70 text-xs">✎</span>} {group.name}
              </Badge>)}
              </div>
            )}
          </div>
        </div>

        <Button 
          variant="default" 
          size="lg"
          onClick={() => navigate("/")} 
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 rounded-xl flex items-center gap-2 shadow-lg border border-purple-500/50 backdrop-blur-sm z-30"
        >
          <ChevronUp className="h-6 w-6" />
          <span>Return to Chat</span>
        </Button>
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    {showDeleteConfirmation && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-red-500/50 rounded-lg p-6 max-w-md w-full shadow-xl">
          <h3 className="text-xl font-bold text-white mb-4">Delete Group</h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete the <span className="font-semibold text-white">{selectedGroup}</span> group? 
            This will remove all contacts from this group and cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirmation(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Group
            </Button>
          </div>
        </div>
      </div>
    )}

    <GroupManagementDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} contacts={contacts} onGroupCreated={() => {
    queryClient.invalidateQueries({
      queryKey: ['contact_groups']
    });
    queryClient.invalidateQueries({
      queryKey: ['group_memberships']
    });
  }} />
    {/* Contact drawer */}
    <Drawer open={isContactDrawerOpen} onOpenChange={setIsContactDrawerOpen}>
      {selectedContact && renderContactDrawerContent(selectedContact)}
    </Drawer>
  </div>;
};

export default ContactsView;
