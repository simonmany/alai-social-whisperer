import { Contact } from "@/types/contacts";
import { ContactCard } from "./ContactCard";

interface DeepSpaceViewProps {
  contacts: Contact[];
}

export const DeepSpaceView = ({ contacts }: DeepSpaceViewProps) => {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black/90">
      <div className="container mx-auto p-4 pb-32"> {/* Added pb-32 for consistent bottom padding */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              name={contact.name}
              phone={contact.phone}
              instagram={contact.instagram}
              linkedin={contact.linkedin}
              twitter={contact.twitter}
              meetingStory={contact.meeting_story}
              relationship={contact.relationship}
            />
          ))}
        </div>
      </div>
    </div>
  );
};