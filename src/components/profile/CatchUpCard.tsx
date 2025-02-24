import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contacts";
import { ContactCard } from "@/components/ContactCard";

interface CatchUpCardProps {
  userId: string;
}

export const CatchUpCard = ({ userId }: CatchUpCardProps) => {
  const { data: catchUpContacts, isLoading } = useQuery({
    queryKey: ['catch-up-contacts', userId],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('catch_up_contacts')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      
      if (!profile?.catch_up_contacts?.length) return [];

      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', profile.catch_up_contacts);

      if (contactsError) throw contactsError;
      
      return contacts as Contact[];
    },
    enabled: !!userId
  });

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) return null;
  if (!catchUpContacts?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">People to Catch Up With</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {catchUpContacts.map((contact) => (
            <Drawer key={contact.id}>
              <DrawerTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    {contact.relationship && (
                      <div className="text-sm text-muted-foreground">
                        {contact.relationship}
                      </div>
                    )}
                  </div>
                </div>
              </DrawerTrigger>
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
            </Drawer>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
