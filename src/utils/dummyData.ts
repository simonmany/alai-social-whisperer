import { addDays, setHours, setMinutes } from "date-fns";

const today = new Date();

export const dummyEvents = [
  {
    id: "dummy-1",
    title: "Coffee Chat with Alex",
    description: "Discuss startup ideas",
    start_time: setHours(setMinutes(today, 30), 10).toISOString(), // Today at 10:30
    end_time: setHours(setMinutes(today, 30), 11).toISOString(),
  },
  {
    id: "dummy-2",
    title: "Lunch with Sarah",
    description: "Catch up over lunch",
    start_time: setHours(setMinutes(today, 0), 12).toISOString(), // Today at 12:00
    end_time: setHours(setMinutes(today, 0), 13).toISOString(),
  },
  {
    id: "dummy-3",
    title: "Book Club Meeting",
    description: "Discussing 'The Midnight Library'",
    start_time: setHours(setMinutes(addDays(today, 2), 0), 18).toISOString(), // In 2 days at 18:00
    end_time: setHours(setMinutes(addDays(today, 2), 0), 19).toISOString(),
  },
  {
    id: "dummy-4",
    title: "Movie Night",
    description: "Watch the new Marvel movie",
    start_time: setHours(setMinutes(addDays(today, 4), 0), 20).toISOString(), // In 4 days at 20:00
    end_time: setHours(setMinutes(addDays(today, 4), 0), 22).toISOString(),
  },
  {
    id: "dummy-5",
    title: "Weekly Team Sync",
    description: "Project updates and planning",
    start_time: setHours(setMinutes(addDays(today, 7), 0), 15).toISOString(), // In 7 days at 15:00
    end_time: setHours(setMinutes(addDays(today, 7), 0), 16).toISOString(),
  },
];