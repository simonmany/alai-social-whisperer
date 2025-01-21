import { Calendar } from "@/components/ui/calendar";
import { PageContainer } from "./Index";
import { useState } from "react";

const CalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <PageContainer>
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto bg-white rounded-lg shadow-lg">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border shadow"
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default CalendarView;