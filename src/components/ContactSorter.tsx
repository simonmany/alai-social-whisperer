import { useState, useEffect } from 'react';
import { Contact } from '@/types/contacts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, Archive, Undo, Plus } from 'lucide-react';

interface ContactSorterProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSorted: () => void;
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

export const ContactSorter = ({ isOpen, onClose, onContactSorted }: ContactSorterProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [history, setHistory] = useState<{contact: Contact, action: string}[]>([]);
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();
  const [sortedCount, setSortedCount] = useState(0);

  const fetchContacts = async () => {
    try {
      const { data: memberships } = await supabase
        .from('contact_group_memberships')
        .select('contact_id');

      const groupedContactIds = new Set(memberships?.map(m => m.contact_id) || []);

      const { data: allContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('is_archived', false);

      if (allContacts) {
        const unsortedContacts = allContacts
          .filter(contact => !groupedContactIds.has(contact.id))
          .map(contact => ({
            ...contact,
            interests: (contact.interests as string[]) || [],
          }));
        
        setContacts(unsortedContacts);
        if (unsortedContacts.length > 0 && !currentContact) {
          setCurrentContact(unsortedContacts[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data } = await supabase
        .from('contact_groups')
        .select('*');
      if (data) {
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      fetchGroups();
    }
  }, [isOpen]);

  const handleArchive = async (contact: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_archived: true })
        .eq('id', contact.id);

      if (error) throw error;

      setHistory([...history, { contact, action: 'archive' }]);
      setSortedCount(prev => prev + 1);
      setContacts(contacts.filter(c => c.id !== contact.id));
      setCurrentContact(contacts[1] || null);
      toast({
        title: "Contact archived",
        description: `${contact.name} has been moved to archives`,
      });
    } catch (error: any) {
      toast({
        title: "Error archiving contact",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddToGroup = async (contact: Contact, groupId: string) => {
    try {
      const { error } = await supabase
        .from('contact_group_memberships')
        .insert([{ contact_id: contact.id, group_id: groupId }]);

      if (error) throw error;

      setHistory([...history, { contact, action: 'group' }]);
      setSortedCount(prev => prev + 1);
      setContacts(contacts.filter(c => c.id !== contact.id));
      setCurrentContact(contacts[1] || null);
      toast({
        title: "Contact grouped",
        description: `${contact.name} has been added to the group`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding contact to group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !currentContact) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      const { data: newGroup, error: groupError } = await supabase
        .from('contact_groups')
        .insert([{ 
          name: newGroupName,
          user_id: session.user.id 
        }])
        .select()
        .single();

      if (groupError) throw groupError;

      if (newGroup) {
        const { error: membershipError } = await supabase
          .from('contact_group_memberships')
          .insert([{ contact_id: currentContact.id, group_id: newGroup.id }]);

        if (membershipError) throw membershipError;

        setGroups([...groups, newGroup]);
        setHistory([...history, { contact: currentContact, action: 'new_group' }]);
        setSortedCount(prev => prev + 1);
        setContacts(contacts.filter(c => c.id !== currentContact.id));
        setCurrentContact(contacts[1] || null);
        setIsNewGroupDialogOpen(false);
        setNewGroupName('');
        toast({
          title: "Group created",
          description: `${currentContact.name} has been added to ${newGroupName}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUndo = async () => {
    const lastAction = history[history.length - 1];
    if (!lastAction) return;

    try {
      if (lastAction.action === 'archive') {
        await supabase
          .from('contacts')
          .update({ is_archived: false })
          .eq('id', lastAction.contact.id);
      } else if (lastAction.action === 'group' || lastAction.action === 'new_group') {
        await supabase
          .from('contact_group_memberships')
          .delete()
          .eq('contact_id', lastAction.contact.id);
      }

      setHistory(history.slice(0, -1));
      setSortedCount(prev => prev - 1);
      setContacts([lastAction.contact, ...contacts]);
      setCurrentContact(lastAction.contact);
      
      toast({
        title: "Action undone",
        description: "The last action has been reversed",
      });
    } catch (error: any) {
      toast({
        title: "Error undoing action",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 border-purple-500/50 max-w-4xl h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Sort Your Contacts</DialogTitle>
          <DialogDescription className="text-gray-400">
            Organize your contacts into groups or archive them
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-8">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="text-white hover:bg-purple-900/50"
            >
              <Undo className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-purple-900/50"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {currentContact ? (
            <div className="flex flex-col items-center space-y-4">
              <div 
                className="h-32 w-32 rounded-full shadow-lg flex items-center justify-center relative overflow-hidden"
                style={{
                  background: getContactGradient(currentContact.id),
                }}
              >
                <div className="absolute inset-0 bg-black/10"></div>
                <span className="relative text-white font-semibold text-3xl z-10">
                  {getInitials(currentContact.name)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">{currentContact.name}</h2>

              <div className="flex justify-between w-full max-w-md mt-8">
                <Button
                  variant="ghost"
                  onClick={() => handleArchive(currentContact)}
                  className="flex-1 mr-2 bg-red-900/50 text-white hover:bg-red-800/50"
                >
                  <Archive className="h-5 w-5 mr-2" />
                  Archive
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleAddToGroup(currentContact, group.id)}
                    className="group relative flex flex-col items-center"
                  >
                    <div className="h-20 w-20 rounded-full bg-purple-900/50 border border-purple-500/50 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-900/50 rounded-full"></div>
                      <span className="text-white font-semibold relative z-10">
                        {group.emoji || "👥"} {group.name}
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setIsNewGroupDialogOpen(true)}
                  className="group relative flex flex-col items-center"
                >
                  <div className="h-20 w-20 rounded-full bg-purple-900/50 border-2 border-dashed border-purple-500/50 flex items-center justify-center relative">
                    <Plus className="h-8 w-8 text-purple-300" />
                  </div>
                  <span className="mt-2 text-sm text-white opacity-80">
                    Create New Group
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-xl text-white">No more contacts to sort!</p>
              <Button
                variant="ghost"
                onClick={onClose}
                className="mt-4 text-white hover:bg-purple-900/50"
              >
                Close
              </Button>
            </div>
          )}
        </div>

        <Dialog open={isNewGroupDialogOpen} onOpenChange={setIsNewGroupDialogOpen}>
          <DialogContent className="bg-black/90 border-purple-500/50">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Group</DialogTitle>
              <DialogDescription className="text-gray-400">
                Enter a name for your new group
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-purple-900/20 border-purple-500/50 text-white"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsNewGroupDialogOpen(false)}
                  className="text-white hover:bg-purple-900/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
