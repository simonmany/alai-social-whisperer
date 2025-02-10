import { useState, useEffect } from "react";
import { Contact } from "@/types/contacts";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ContactGroupsManager from "./ContactGroupsManager";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ContactSorter } from './ContactSorter';

interface DeepSpaceViewProps {
  contacts: Contact[];
}

const PAGE_SIZE = 1000;

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

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

export const DeepSpaceView = ({ contacts }: DeepSpaceViewProps) => {
  const [ungroupedContacts, setUngroupedContacts] = useState<Contact[]>([]);
  const [totalUngroupedCount, setTotalUngroupedCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isSorterOpen, setIsSorterOpen] = useState(false);
  const [sortedCount, setSortedCount] = useState(0);

  const loadContacts = async (currentPage: number, isLoadingMore = false) => {
    try {
      if (isLoadingMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      
      // Get all group memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('contact_group_memberships')
        .select('contact_id');

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        toast({
          title: "Error fetching group memberships",
          description: membershipError.message,
          variant: "destructive"
        });
        return;
      }

      // Create a Set of grouped contact IDs for efficient lookup
      const groupedContactIds = new Set(memberships?.map(m => m.contact_id) || []);
      
      if (searchQuery) {
        // If searching, filter across all contacts
        const searchResults = contacts.filter(contact => 
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !groupedContactIds.has(contact.id)
        );
        setUngroupedContacts(searchResults);
        setTotalUngroupedCount(searchResults.length);
        setHasMore(false); // Disable pagination during search
      } else {
        // Calculate total ungrouped contacts first
        const totalUngrouped = contacts.filter(contact => !groupedContactIds.has(contact.id)).length;
        setTotalUngroupedCount(totalUngrouped);
        
        // Normal pagination when not searching
        const startIndex = currentPage * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const pageContacts = contacts.slice(startIndex, endIndex);
        
        // Filter contacts that aren't in any groups from the current page
        const filteredContacts = pageContacts.filter(contact => !groupedContactIds.has(contact.id));
        console.log(`Found ${filteredContacts.length} ungrouped contacts for page ${currentPage}`);
        
        // If we're loading more, append to existing contacts
        if (isLoadingMore) {
          setUngroupedContacts(prev => [...prev, ...filteredContacts]);
        } else {
          setUngroupedContacts(filteredContacts);
        }

        // Update hasMore based on whether there are more contacts to load
        setHasMore(endIndex < contacts.length);
      }
      
    } catch (error: any) {
      console.error('Error in loadContacts:', error);
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      if (isLoadingMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setPage(0); // Reset page when search query changes
    loadContacts(0);
  }, [contacts, searchQuery]); // Added searchQuery as dependency

  // Use ungroupedContacts directly since filtering is now handled in loadContacts
  const filteredContacts = ungroupedContacts;

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setPage(prev => prev + 1);
      loadContacts(page + 1, true);
    }
  };

  const renderContactDrawerContent = (contact: Contact) => (
    <DrawerContent className="bg-black/90 border-purple-500/50 h-[100vh] overflow-y-auto">
      <div className="p-6 space-y-8 relative z-10">
        <DrawerTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 left-4 text-white hover:bg-purple-900/50"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </DrawerTrigger>

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

  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/90 p-4 pb-40">
      <div className="flex justify-between items-center mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-black/50 border-purple-500/50 text-white"
          />
        </div>
        <Badge 
          variant="outline" 
          className="ml-4 bg-purple-900/50 border-purple-500/50 text-purple-100"
        >
          {isLoading ? "Loading..." : `${totalUngroupedCount} in Deep Space`}
        </Badge>
      </div>

      <Button
        variant="outline"
        onClick={() => setIsSorterOpen(true)}
        className="w-full mb-8 bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50"
      >
        Start Exploring: {sortedCount} contacts sorted
      </Button>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredContacts.map((contact) => (
              <Drawer key={contact.id}>
                <DrawerTrigger className="w-full">
                  <div className="group relative flex flex-col items-center">
                    <div 
                      className="h-20 w-20 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: getContactGradient(contact.id),
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10"></div>
                      <span className="relative text-white font-semibold text-lg z-10">
                        {getInitials(contact.name)}
                      </span>
                    </div>
                    <span className="mt-2 text-sm text-white opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                      {contact.name}
                    </span>
                  </div>
                </DrawerTrigger>
                {renderContactDrawerContent(contact)}
              </Drawer>
            ))}
          </div>

          {!searchQuery && hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="bg-purple-900/50 border-purple-500/50 text-white hover:bg-purple-800/50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Contacts'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <ContactSorter
        isOpen={isSorterOpen}
        onClose={() => setIsSorterOpen(false)}
        onContactSorted={() => {
          setSortedCount(prev => prev + 1);
          loadContacts(0);
        }}
      />
    </div>
  );
};
