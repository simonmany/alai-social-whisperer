import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

interface ContactGroupsManagerProps {
  contactId: string;
}

const ContactGroupsManager = ({ contactId }: ContactGroupsManagerProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
    loadMemberships();
  }, [contactId]);

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*');
    
    if (!error && data) {
      setGroups(data);
    }
  };

  const loadMemberships = async () => {
    const { data, error } = await supabase
      .from('contact_group_memberships')
      .select('group_id')
      .eq('contact_id', contactId);
    
    if (!error && data) {
      setMemberGroups(data.map(m => m.group_id));
    }
  };

  const toggleGroupMembership = async (groupId: string) => {
    const isMember = memberGroups.includes(groupId);
    
    try {
      if (isMember) {
        await supabase
          .from('contact_group_memberships')
          .delete()
          .eq('contact_id', contactId)
          .eq('group_id', groupId);
        
        setMemberGroups(prev => prev.filter(id => id !== groupId));
      } else {
        await supabase
          .from('contact_group_memberships')
          .insert([{ contact_id: contactId, group_id: groupId }]);
        
        setMemberGroups(prev => [...prev, groupId]);
      }

      toast({
        title: "Success",
        description: isMember ? "Removed from group" : "Added to group",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group membership",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Groups</h3>
      <ScrollArea className="h-[100px]">
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const isMember = memberGroups.includes(group.id);
            return (
              <Badge
                key={group.id}
                variant={isMember ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleGroupMembership(group.id)}
              >
                {group.name}
                {isMember ? (
                  <X className="ml-1 h-3 w-3" />
                ) : (
                  <Plus className="ml-1 h-3 w-3" />
                )}
              </Badge>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContactGroupsManager;