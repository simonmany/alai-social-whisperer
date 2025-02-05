import { useState, useEffect } from "react";
import { Contact } from "@/types/contacts";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ContactGroupsManager from "./ContactGroupsManager";
import { supabase } from "@/integrations/supabase/client";

interface DeepSpaceViewProps {
  contacts: Contact[];
}

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

  useEffect(() => {
    const fetchUngroupedContacts = async () => {
      const { data: memberships } = await supabase
        .from('contact_group_memberships')
        .select('contact_id');

      const groupedContactIds = new Set(memberships?.map(m => m.contact_id) || []);
      const filteredContacts = contacts.filter(contact => !groupedContactIds.has(contact.id));
      setUngroupedContacts(filteredContacts);
    };

    fetchUngroupedContacts();
  }, [contacts]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {ungroupedContacts.map((contact) => (
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
    </div>
  );
};