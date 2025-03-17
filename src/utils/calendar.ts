import { CapacitorCalendar, CalendarEvent, CalendarPermissionScope } from "@ebarooni/capacitor-calendar";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Contact } from "@/types/contacts";


export async function requestCalendarAccess() {
  if (!Capacitor.isNativePlatform()) return;

  const { result: readStatus } = await CapacitorCalendar.requestFullCalendarAccess();
  return readStatus;
}

export async function checkPermissions(): Promise<{ 
  status: 'read' | 'write' | 'all' | 'none';
}> {
    if (!Capacitor.isNativePlatform()) {
        return { status: 'all' };
    }
    const { result: readStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.READ_CALENDAR});
    const { result: writeStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.WRITE_CALENDAR});

    if (readStatus === 'granted' || writeStatus === 'granted') {
        if (readStatus === 'granted' && writeStatus === 'granted') {
            return { status: "all" };
        } else if (readStatus === 'granted') {
            return { status: "read" };
        } else if (writeStatus === 'granted') {
            return { status: "write" };
        }
    }
    return { status: "none" };
}

export const synchronizeEvents = async (userId: string): Promise<{ 
  added: number;
  updated: number;
  error?: string;
}> => {
  // Only proceed if we're on a native platform
  if (!Capacitor.isNativePlatform()) {
    return { added: 0, updated: 0, error: 'Calendar sync is only available on native platforms' };
  }
  // Check calendar permissions
  const { result: permissionStatus } = await CapacitorCalendar.checkPermission({scope: CalendarPermissionScope.READ_CALENDAR});
  if (permissionStatus !== 'granted') {
    return { added: 0, updated: 0, error: 'Calendar permission not granted, click connect calendar' };
  }
  try {
    // Get events for the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const tenDaysBeforeNow = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    
    // Fetch native calendar events
    const { result: nativeEvents } = await CapacitorCalendar.listEventsInRange({
      from: tenDaysBeforeNow.getTime(),
      to: thirtyDaysFromNow.getTime()
    });
    console.log(nativeEvents[0]);

    const { added, updated, error } = await supabase.functions.invoke(
      'sync_native_calendar',
      {body:
        { user_id: userId, native_events: nativeEvents}
      }
    )

    if (error) {
      throw new Error(error);
    }

    return {added, updated};

  } catch (error) {
    console.error('Calendar sync error:', error);
    return {
      added: 0, 
      updated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error during calendar sync'
    };
  }
};
