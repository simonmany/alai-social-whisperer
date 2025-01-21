import { PageContainer } from "./Index";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import ContactsDialog from "@/components/ContactsDialog";

const ContactsView = () => {
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  return (
    <PageContainer>
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => setIsContactsOpen(true)} 
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-gray-500">No contacts yet. Add your first contact!</p>
        </div>
        <ContactsDialog
          open={isContactsOpen}
          onOpenChange={setIsContactsOpen}
          onSubmit={(message) => {
            console.log(message);
            setIsContactsOpen(false);
          }}
        />
      </div>
    </PageContainer>
  );
};

export default ContactsView;