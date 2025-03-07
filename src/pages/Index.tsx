import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConversationType, generateChatResponse } from "@/utils/openai";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainNavigation } from "@/components/MainNavigation";
import { ChatContainer } from "@/components/ChatContainer";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Button } from "@/components/ui/button";
import { Redo, Play, RefreshCw } from "lucide-react";
import Profile from "./Profile";
import FeedbackDialog from "@/components/FeedbackDialog";
import GoalsDialog from "@/components/GoalsDialog";
import ContactsDialog from "@/components/ContactsDialog";
import { useAuth } from "@/components/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { Contact } from "@/types/contacts";
import { APP_CONSTANTS } from "@/utils/constants";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { startOfDay, format } from "date-fns";
import { TIME_OPTIONS } from "@/utils/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Message, ChatHistoryMessage } from "@/types/chat";
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@skektec/capacitor-contacts';
import { CalendarEvent } from "@/types/calendar";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [showProfileButton, setShowProfileButton] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [preventHistoryLoad, setPreventHistoryLoad] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [lastContactSync, setLastContactSync] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [conversationType, setConversationType] = useState(ConversationType.CHAT)
  
  // Define handleFeedbackSubmit at the top level of the component
  const handleFeedbackSubmit = async (message: string, event?: CalendarEvent, moods?: string[], notes?: string) => {
    if (!session?.user?.id) return;

    // Remove the feedback form from messages
    setMessages(prev => prev.filter(msg => !msg.showFeedbackForm));

    setIsLoading(true);
    // We no longer add messages directly to the UI
    // The real-time subscription will handle adding messages to the UI

    try {
      // If we have an event, update it in the database
      if (event?.id) {
        await supabase
          .from('calendar_events')
          .update({
            mood: moods?.join(', '),
            feedback_notes: notes,
            feedback_sent: true
          })
          .eq('id', event.id);
      }

      // Generate the chat response - this will save both messages to the database
      // and they will be picked up by the real-time subscription
      await generateChatResponse(message, [], false, ConversationType.CHAT);
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        console.log('Onboarding status:', data?.onboarding_completed);
        setShowOnboarding(!data?.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session?.user?.id]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!session?.user?.id || preventHistoryLoad) return;

      try {
        const today = new Date();
        const dayStart = startOfDay(today);
        
        // When in tutorial mode, we want to show all messages including secret ones
        // When not in tutorial mode, filter out secret messages
        let query = supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', dayStart.toISOString());
          
        // If tutorial is complete, only filter out secret messages
        // We want to keep onboarding messages visible
        if (tutorialComplete) {
          query = query.eq('is_secret', false);
        }
          
        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const historyMessages = await Promise.all((data as ChatHistoryMessage[]).map(async (msg, index) => {
            let messageContent = msg.message;
            let messageMetadata = null;
            
            let messageType: 'morning' | 'evening' | 'post-event' | undefined;

            if (msg.morning_checkin) {
              messageType = 'morning';
            } else if (msg.evening_checkin) {
              messageType = 'evening';
            } else if (msg.event_id) {
              messageType = 'post-event';
            }
            try {
              // Handle both string and JSON message formats
              if (typeof msg.message === 'string') {
                try {
                  const parsedMessage = JSON.parse(msg.message);
                  if (parsedMessage.text && parsedMessage.metadata) {
                    messageContent = parsedMessage.text;
                    messageMetadata = parsedMessage.metadata;
                  }
                } catch (parseError) {
                  // If parsing fails, use the message as-is
                  messageContent = msg.message;
                }
              } else if (typeof msg.message === 'object') {
                // Handle case where message is already an object
                messageContent = msg.message.text || msg.message;
                messageMetadata = msg.message.metadata;
              }
            } catch (e) {
              // Message is not in JSON format, use as is
            }
            
            const message: Message = {
              id: msg.id,
              content: messageContent,
              isAl: msg.is_ai,
              is_secret: msg.is_secret,
              eventId: msg.event_id,
              eventTitle: msg.event_title,
              showFeedbackForm: msg.event_id ? true : false,
              messageType,
              // Only show planning form for the latest onboarding message
              showPlanningForm: msg.is_onboarding_message && index === data.length - 1,
              onPlanningSubmit: handlePlanSubmit,
              //defaultContacts: messageMetadata?.defaultContact ? [{ name: messageMetadata.defaultContact }] : undefined,
              defaultActivity: messageMetadata?.defaultActivity,
              typewriterPlayed: msg.typewriter_played || false,
            };
            
            // If this is a post-event message, fetch the event details
            if (msg.event_id) {
              const { data: eventData, error: eventError } = await supabase
                .from('calendar_events')
                .select(`
                  *,
                  event_attendees!left (contacts!contact_id (id, name, user_id))
                `)
                .eq('id', msg.event_id)
                .maybeSingle();

              if (eventError) {
                console.error('Error fetching event:', eventError);
              }

              if (eventData && !eventData.feedback_sent) {
                message.completedEvent = eventData;
                message.onFeedbackSubmit = handleFeedbackSubmit;
                message.feedbackStep = "mood-selection";
                
                // Format attendees for display
                if (eventData.event_attendees) {
                  const attendees = eventData.event_attendees.map((ea: any) => ({
                    id: ea.contacts.id,
                    name: ea.contacts.name,
                    user_id: ea.contacts.user_id
                  }));
                  
                  message.completedEvent.attendees = attendees;
                }
              }
            }

            return message;
          }));
          setMessages(historyMessages);
        } else {
          // Set initial welcome message with default metadata
          const initialMessage = {
            text: "Hello! I'm here to help you plan and maintain meaningful connections. What would you like to do?",
            metadata: {
              defaultContact: null,
              defaultActivity: null
            }
          };
          
          setMessages([{ 
            content: initialMessage.text,
            isAl: true,
            metadata: initialMessage.metadata
          }]);
          
          // Store in chat history
          const { data: insertedMessage, error: insertError } = await supabase
            .from('chat_history')
            .insert([{
              message: JSON.stringify(initialMessage),
              is_ai: true,
              user_id: session.user.id,
              is_onboarding_message: false
            }])
            .select()
            .single();
            
          if (insertError) {
            console.error('Error inserting initial message:', insertError);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    // Only load chat history when session changes or preventHistoryLoad is toggled
    // Don't reload when tutorialComplete changes - this prevents clearing messages
    loadChatHistory();
  }, [session?.user?.id, preventHistoryLoad]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    console.log('last message', lastMessage);
  }, [messages]);

  const handleOnboardingComplete = async () => {
    console.log('Completing onboarding...');
    if (!session?.user.id) return;
    
    try {
      setShowOnboarding(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      setTutorialComplete(false);
      setShowProfileButton(false);
      handleStartTutorial();

    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error completing onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleStartTutorial = async () => {
    if (!session?.user.id) return;
    
    try {
      // Reset any existing tutorial state
      localStorage.removeItem('tutorialStep');
      localStorage.removeItem('tutorialPlanSubmissionId');
      
      // Set tutorial step to track progress
      localStorage.setItem('tutorialStep', 'welcome');
      
      // Set a flag to prevent automatic history loading
      setPreventHistoryLoad(true);
      
      // Clear all messages first
      setMessages([]);
      
      if (showOnboarding) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_completed: true,
            onboarding_step: 'splash',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);

        setShowOnboarding(false);
      } else {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: 'splash',
            has_completed_tutorial: false
          })
          .eq('id', session.user.id);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, catch_up_contacts, desired_interests')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      let contactData = null;
      let contactName = '';
      if (profileData?.catch_up_contacts?.[0]) {
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', profileData.catch_up_contacts[0])
          .single();

        if (!contactError && contact) {
          contactName = contact.name;
          contactData = contact;
        }
      }

      console.log('profileData:', profileData);
      console.log('desired_interests:', profileData?.desired_interests);
      const desiredInterest = profileData?.desired_interests?.[0] || '';

      const welcomeMessage = `Hey ${profileData?.display_name || ''}. Thanks for taking the time to check me out - it means you care about the quality of your relationships and living a full life.\n\n${contactName ? `Let's dive right in and get started planning your first Hang!\n\nYou mentioned wanting to see ${contactName} for ${desiredInterest}. Now, we just need to figure out *when* and *where*. You can fill in the blanks yourself, or have AI figure it out for you based on your calendar and location!` : "Let's dive right in and get started planning your first Hang!"}`;
      
      // Insert welcome message into chat history with metadata in the message
      const messageMetadata = {
        defaultContact: contactName,
        defaultActivity: desiredInterest
      };
      
      const { data: insertedMessage, error: insertError } = await supabase
        .from('chat_history')
        .insert([{
          message: JSON.stringify({
            text: welcomeMessage,
            metadata: messageMetadata
          }),
          is_ai: true,
          user_id: session.user.id,
          is_onboarding_message: true
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting welcome message:', insertError);
        return;
      }

      // Wait for the real-time subscription to catch up
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the message was inserted
      const { data: verifyMessage, error: verifyError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_onboarding_message', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (verifyError || !verifyMessage) {
        console.error('Error verifying welcome message:', verifyError);
        // Retry the message insertion
        await supabase
          .from('chat_history')
          .insert([{
            message: JSON.stringify({
              text: welcomeMessage,
              metadata: messageMetadata
            }),
            is_ai: true,
            user_id: session.user.id,
            is_onboarding_message: true
          }]);
      }
      
      // Immediately display the welcome message in the UI
      setMessages([{
        id: insertedMessage?.id || 'temp-welcome',
        content: welcomeMessage,
        isAl: true,
        metadata: messageMetadata,
        showPlanningForm: true,
        onPlanningSubmit: handlePlanSubmit,
        defaultContacts: contactName ? [{ name: contactName, id: contactData?.id }] : undefined,
        defaultActivity: messageMetadata.defaultActivity,
        typewriterPlayed: false
      }]);
      
      setTutorialComplete(false);
      setShowProfileButton(false);

      // Wait for the real-time subscription to catch up
      await new Promise(resolve => setTimeout(resolve, 100));

      // We don't need to fetch messages again since we're manually setting the welcome message
      // Keep the preventHistoryLoad flag set to true to prevent automatic loading
      
      // Only allow chat history to load again after the user interacts with the planning form
      // This prevents old messages from suddenly appearing

      if (contactData) {
        setSelectedContact(contactData);
        if (contactData.interests && contactData.interests.length > 0) {
          const randomInterest = contactData.interests[
            Math.floor(Math.random() * contactData.interests.length)
          ];
          setSelectedActivity(randomInterest);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      
    } catch (error: any) {
      console.error('Error starting tutorial:', error);
      toast({
        title: "Error starting tutorial",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSkipOnboarding = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          has_completed_tutorial: true,
          onboarding_step: 'complete'
        })
        .eq('id', session.user.id);

      // Don't clear existing messages if there are any
      // If there are no messages, add a welcome message
      if (messages.length === 0) {
        const welcomeMessage = "Hello! I'm here to help you plan and maintain meaningful connections. What would you like to do?";
        
        setMessages([{ 
          content: welcomeMessage,
          isAl: true
        }]);
        
        // Save welcome message to chat history
        await supabase
          .from('chat_history')
          .insert([{
            message: JSON.stringify({
              text: welcomeMessage
            }),
            is_ai: true,
            user_id: session.user.id
          }]);
      }
      
      setShowOnboarding(false);
      setTutorialComplete(true);
      setShowProfileButton(true);
      setConversationType(ConversationType.CHAT);
      
      toast({
        title: "Onboarding skipped",
        description: "You can restart onboarding using the button in the bottom left",
      });
    } catch (error: any) {
      console.error('Error skipping onboarding:', error);
      toast({
        title: "Error skipping onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleTestMorningCheckin = async () => {
    if (!session?.user.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('daily-checkin', {
        body: { 
          type: 'morning',
          user_id: session.user.id
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Morning check-in triggered",
        description: "The morning check-in function has been executed.",
      });
    } catch (error: any) {
      console.error('Error triggering morning check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger morning check-in",
        variant: "destructive",
      });
    }
  };

  const handleTestEveningCheckin = async () => {
    if (!session?.user.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('daily-checkin', {
        body: { 
          type: 'evening',
          user_id: session.user.id
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Evening check-in triggered",
        description: "The evening check-in function has been executed.",
      });
    } catch (error: any) {
      console.error('Error triggering evening check-in:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger evening check-in",
        variant: "destructive",
      });
    }
  };

  const handleTestCompletedEvents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-events');
      
      if (error) throw error;
      
      toast({
        title: "Completed events check triggered",
        description: data?.events_processed 
          ? `Processed ${data.events_processed} events between ${new Date(data.time_window.start).toLocaleString()} and ${new Date(data.time_window.end).toLocaleString()}`
          : "No events found in the specified time window",
      });
    } catch (error: any) {
      console.error('Error checking completed events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check completed events",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const setupMessagesSubscription = () => {
      if (!session?.user.id) return;

      console.log('Setting up real-time messages subscription');
      
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_history',
            filter: `user_id=eq.${session.user.id}`
          },
          async (payload) => {
            // Skip tutorial messages in the real-time subscription
            // We handle these manually in the tutorial flow
            if (payload.new.is_onboarding_message) {
              console.log('Skipping tutorial message in real-time subscription:', payload.new.id);
              return;
            }
            
            // Create a flag to track if this message is already being handled
            let isHandlingMessage = false;
            
            const onFeedbackSubmit = async (feedback: string) => {
              try {
                // Set flag to indicate we're handling this message
                isHandlingMessage = true;
                
                // Update both feedback and feedback_sent flag when user submits
                await supabase
                  .from('calendar_events')
                  .update({ 
                    feedback_sent: true, 
                    feedback 
                  })
                  .eq('id', payload.new.event_id);

                // Remove the feedback form after successful submission
                setMessages(prev => prev.map(msg => 
                  msg.eventId === payload.new.event_id 
                    ? { ...msg, showFeedbackForm: false }
                    : msg
                ));

                toast({
                  title: "Feedback submitted",
                  description: "Thank you for your feedback!"
                });
                
                // Reset the flag after a short delay to ensure we don't miss subsequent messages
                setTimeout(() => {
                  isHandlingMessage = false;
                }, 1000);
              } catch (error) {
                console.error('Error submitting feedback:', error);
                toast({
                  title: "Error",
                  description: "Failed to submit feedback",
                  variant: "destructive"
                });
                isHandlingMessage = false;
              }
            };
            
            // If this is a post-event message, fetch the full event details with attendees
            let eventData = null;
            // Parse message content if it's JSON
            let messageContent = payload.new.message;
            let messageMetadata = null;
            
            try {
              if (typeof payload.new.message === 'string') {
                const parsedMessage = JSON.parse(payload.new.message);
                if (parsedMessage.text && parsedMessage.metadata) {
                  messageContent = parsedMessage.text;
                  messageMetadata = parsedMessage.metadata;
                }
              }
            } catch (e) {
              // Use message as-is if parsing fails
              console.log('Message not in JSON format, using as is');
            }

            if (payload.new.event_id) {
              console.log('Fetching event details for:', payload.new.event_id);
              const { data, error: eventError } = await supabase
                .from('calendar_events')
                .select(`
                  *,
                  event_attendees!left (contacts!contact_id (id, name))
                `)
                .eq('id', payload.new.event_id)
                .maybeSingle();

              if (eventError) {
                console.error('Error fetching event:', eventError);
              } else {
                eventData = data;
                console.log('Event data:', {
                  id: eventData?.id,
                  title: eventData?.title,
                  feedback_sent: eventData?.feedback_sent
                });
              }
            }
            let messageType: 'morning' | 'evening' | 'post-event' | undefined = undefined;
            if (payload.new.morning_checkin) {
              messageType = 'morning';
            } else if (payload.new.evening_checkin) {
              messageType = 'evening';
            } else if (payload.new.event_id) {
              messageType = 'post-event';
            }

            // Create message after we have all the data

            let newMessage: Message = {
              id: payload.new.id, // Add message ID
              content: messageContent,
              isAl: payload.new.is_ai,
              is_secret: payload.new.is_secret,
              showPlanningForm: false,
              showFeedbackForm: !!eventData && !eventData.feedback_sent,
              eventId: payload.new.event_id,
              eventTitle: payload.new.event_title,
              completedEvent: eventData || undefined,
              onFeedbackSubmit: (eventData && !eventData.feedback_sent) ? onFeedbackSubmit : undefined,
              onPlanningSubmit: handlePlanSubmit,
              //defaultContacts: messageMetadata?.defaultContact ? [{ name: messageMetadata.defaultContact }] : undefined,
              defaultActivity: messageMetadata?.defaultActivity,
              messageType
            };

            // Simply add the new message to the UI
            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up messages subscription');
        supabase.removeChannel(channel);
      };
    };

    setupMessagesSubscription();

    return () => {
      cleanup && cleanup();
    };
  }, [session?.user.id, toast]);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!session?.user.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_tutorial, onboarding_completed, onboarding_step')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        console.log('Tutorial status check:', {
          hasCompletedTutorial: data.has_completed_tutorial,
          onboardingCompleted: data.onboarding_completed,
          onboardingStep: data.onboarding_step
        });

        setTutorialComplete(!!data.has_completed_tutorial);
        setShowOnboarding(!data.onboarding_completed);
        
        setShowProfileButton(data.onboarding_step !== 'splash' && data.onboarding_step !== 'initial');
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };

    checkTutorialStatus();
  }, [session?.user?.id]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!session?.user.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        setShowOnboarding(!data.onboarding_completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [session?.user.id]);

  useEffect(() => {
    const state = location.state as { prompt?: string };
    if (state?.prompt) {
      handleSend(state.prompt);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_SIGN_IN_SUCCESS') {
        console.log("Received success message from popup");
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          
          if (session) {
            console.log("Session refreshed successfully, navigating to home");
            navigate("/");
          } else {
            throw new Error("No session after refresh");
          }
        } catch (error: any) {
          console.error("Error refreshing session:", error);
          toast({
            title: "Error signing in",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, toast]);

  const syncContacts = async () => {
    if (!Capacitor.isNativePlatform() || !session?.user?.id) return;

    try {
      const { contacts } = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          postalAddresses: true,
        }
      });

      const { result, error } = await supabase.functions.invoke('sync_native_contacts', {body: {user_id: session?.user?.id, native_contacts: contacts}});

      if (error) {
        throw new Error(error);
      }
      setLastContactSync(new Date());
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast({
        title: "Error syncing contacts",
        description: "There was an error syncing your contacts. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const getLastContactSync = async () => {
    if (!session?.user?.id) {
      console.log('No session user id available');
      return null;
    }
    
    try {
      console.log('Fetching last contact sync for user:', session.user.id);
      const { data, error } = await supabase
        .from('contacts')
        .select('updated_at')
        .eq('user_id', session.user.id)
        .not('updated_at','is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error in getLastContactSync:', error);
        throw error;
      }
      return data ? new Date(data.updated_at) : null;
    } catch (error) {
      console.error('Error fetching last contact sync:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not on native platform, skipping contact sync');
      return;
    }

    // Set initial lastContactSync based on most recent contact
    getLastContactSync().then(date => {
      console.log('Setting lastContactSync to:', date);
      setLastContactSync(date);
      // If the last sync was > 6 hours ago, sync now
      if (date && Date.now() - date.getTime() > 6 * 60 * 60 * 1000) {
        console.log('Last contact sync was more than 6 hours ago, syncing now');
        syncContacts();
      }
    });

    // Set up periodic sync (every 6 hours)
    const syncInterval = setInterval(syncContacts, 6 * 60 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [session?.user?.id]);

  useEffect(() => {
    const setupCalendarEventsSubscription = () => {
      if (!session?.user.id || !Capacitor.isNativePlatform()) return;

      console.log('Setting up real-time calendar events subscription');

      const channels = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${session.user.id}` },
          async (payload) => {
            console.log('Change received!', payload);

            if (payload.new.calendar_event_id) {
              console.log('Event already exists on calendar, skipping');
              return;
            }
            
            // If a new event is inserted, add it to the native calendar
            if (payload.eventType === 'INSERT') {
              try {
                const event = payload.new;
                
                // Format the start and end times for the native calendar
                const startTime = new Date(event.start_time);
                // Default to 1 hour duration if end_time is not provided
                const endTime = event.end_time ? new Date(event.end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                
                // Get attendee names if available
                let attendeeNames = '';
                let attendees = [];
                const { data: eventAttendees, error: eventAttendeesError } = await supabase
                  .from('event_attendees')
                  .select('contact_id')
                  .eq('event_id', event.id);
                
                if (eventAttendees && eventAttendees.length > 0) {
                  const { data, error } = await supabase
                    .from('contacts')
                    .select('name, email')
                    .in('id', eventAttendees.map((a: any) => a.contact_id));

                  attendeeNames = data?.map((a: any) => a.name).join(', ') || '';
                  attendees = data;
                }
                
                // Create the event in the native calendar
                await CapacitorCalendar.createEvent({
                  title: event.title,
                  location: event.location || '',
                  description: `${event.description || ''}\n\nAttendees: ${attendeeNames}`,
                  startDate: startTime.getTime(),
                  endDate: endTime.getTime(),
                });

                // TODO (ari) store attendees, though email is required and its less common than phone
                
                console.log('Event added to native calendar:', event.title);
                
              } catch (error) {
                console.error('Error adding event to native calendar:', error);
              }
            }

            if (payload.eventType === 'DELETE') {
              console.log('Event deleted from native calendar:', payload.old.title);
              await CapacitorCalendar.deleteEvent({
                id: payload.old.calendar_event_id,
              });
            }
          }
        )
        .subscribe();

      return () => {
        console.log('Cleaning up calendar events subscription');
        supabase.removeChannel(channels);
      };
    };

    setupCalendarEventsSubscription();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const setUtcOffset = async () => {
      const now = new Date();
      const offset = -(now.getTimezoneOffset());
      const { error } = await supabase
        .from('profiles')
        .update({utc_offset_minutes: offset})
        .eq('id', session?.user?.id);

      if (error) {
        console.warn('Error updating UTC offset minutes for user');
      }
      console.log('UTC offset updated successfully', offset);
    }
    setUtcOffset()
  }, [session?.user?.id]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google Calendar connection...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${APP_CONSTANTS.SITE_URL}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      supabase.functions.invoke('store_auth', {
        body: { name: data }
      });

    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSend = async (message: string, contactInfo?: Contact) => {
    if (!message.trim()) return;

    setIsLoading(true);

    if (message.toLowerCase().includes("talk about past hang") || message === "Reflect") {
      setMessages(prev => [...prev, 
        { content: message, isAl: false },
        { 
          content: "I'd love to hear about your past social experiences! Please select an event from below or tell me about something that wasn't on the calendar.", 
          isAl: true,
          showFeedbackForm: true,
          feedbackStep: "event-selection",
          onFeedbackSubmit: handleFeedbackSubmit
        }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await generateChatResponse(message, contactInfo ? [contactInfo] : undefined, false, conversationType);

      console.log('response', response);
      if (response.contacts && response.activity && response.location && response.datetime && response.datetime?.date && response.datetime?.time) {
        try {
          const [hours, minutes, period] = selectedTime!.match(/(\d+):(\d+) (AM|PM)/)!.slice(1);
          let hour = parseInt(hours);
          if (period === "PM" && hour !== 12) hour += 12;
          if (period === "AM" && hour === 12) hour = 0;
          
          const startTime = new Date(selectedDate!);
          startTime.setHours(hour, parseInt(minutes), 0, 0);

          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);

          const { data: eventData, error: eventError } = await supabase
            .from('calendar_events')
            .insert({
              user_id: session.user.id,
              title: response.activity,
              location: response.location,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
            })
            .select()
            .single();

          if (eventError) throw eventError;

          const { data: selectedContacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', session.user.id)

          if (error) {
            console.error('Error fetching contacts:', error);
            throw error;
          }

          const filteredContacts = selectedContacts.filter(contact => response.contacts.some(name => contact.name.toLowerCase().includes(name.toLowerCase())));

          const attendeesToInsert = filteredContacts.map(contact => ({
            event_id: eventData.id,
            contact_id: contact.id
          }));

          const { error: attendeesError } = await supabase
            .from('event_attendees')
            .insert(attendeesToInsert);

          if (attendeesError) throw attendeesError;

          if (!tutorialComplete) {
            handleTutorialComplete();
          }

        } catch (error: any) {
          console.error('Error creating event:', error);
          toast({
            title: "Error",
            description: "Failed to create event. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTutorialFeedbackSubmit = async (message: string, event?: CalendarEvent, mood?: string[], notes?: string) => {
    // Check current tutorial step
    const currentStep = localStorage.getItem('tutorialStep');
    
    // Prevent duplicate submissions
    if (currentStep === 'feedbackSubmitted') {
      console.log('Feedback already submitted, ignoring duplicate');
      return;
    }
    
    // Mark that we've submitted the feedback
    localStorage.setItem('tutorialStep', 'feedbackSubmitted');
    
    // Add user's feedback message to the UI
    if (message) {
      setMessages(prev => [...prev, { 
        content: message, 
        isAl: false
      }]);
      
      // Save user's message to chat history
      await supabase
        .from('chat_history')
        .insert([{
          message: message,
          is_ai: false,
          user_id: session.user.id,
          is_onboarding_message: true
        }]);
    }
    
    // Send a message acknowledging the feedback
    const finalMessage = "Thanks for sharing. Reflecting on your past hangs helps me suggest better ones - and helps you keep track of valuable memories and conversations.";
    
    // Add the final tutorial message with typewriter animation
    setMessages(prev => [...prev, { 
      content: finalMessage, 
      isAl: true,
      is_onboarding_message: true,
      typewriterPlayed: false // Ensure typewriter animation plays
    }]);
    
    // Save the final message to chat history
    await supabase
      .from('chat_history')
      .insert([{
        message: JSON.stringify({
          text: finalMessage
        }),
        is_ai: true,
        user_id: session.user.id,
        is_onboarding_message: true
      }]);
    
    // Mark the tutorial as complete in the database
    // No need for a delay since we're not clearing messages anymore
    await handleTutorialComplete();
    
    // Don't clear tutorial step - this prevents duplicate submissions
    // but we'll keep the state to track progress
  };
  
  // This function is called when the user submits their plan during the tutorial
  const handlePlanSubmit = async (message: string, newContent?: string) => {
    if (newContent) {
      // Update the existing planning form message
      setMessages(prev => prev.map(msg => 
        msg.showPlanningForm ? {
          ...msg,
          content: newContent,
        } : msg
      ));
    }
    else {
      // Check current tutorial step
      const currentStep = localStorage.getItem('tutorialStep');
      
      // Prevent duplicate submissions
      if (currentStep === 'planSubmitted') {
        console.log('Plan already submitted, ignoring duplicate');
        return;
      }
      
      // Mark that we've submitted the plan
      localStorage.setItem('tutorialStep', 'planSubmitted');
      
      // Create a unique ID for the user message to prevent duplicates
      const userMessageId = crypto.randomUUID();
      
      // Add user's message to the UI with a unique ID
      setMessages(prev => [...prev, { 
        id: userMessageId,
        content: message, 
        isAl: false,
        is_onboarding_message: true
      }]);
      
      // Save user's message to chat history
      await supabase
        .from('chat_history')
        .insert([{
          message: message,
          is_ai: false,
          user_id: session.user.id,
          is_onboarding_message: true
        }]);
      
      // Add loading message while we wait for AI response
      const loadingMessageId = crypto.randomUUID();
      setMessages(prev => [...prev, { 
        id: loadingMessageId,
        content: "Thinking...", 
        isAl: true,
        is_onboarding_message: true,
        isLoading: true
      }]);
      
      try {
        // Generate AI response to the plan
        const response = await generateChatResponse(message, [], true, ConversationType.TUTORIAL);
        
        // Remove loading message
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
        
        // Add AI response to the UI
        setMessages(prev => [...prev, { 
          content: response.message || "That sounds like a great plan! I've added it to your calendar.", 
          isAl: true,
          is_onboarding_message: true
        }]);
        
        // Wait for a short delay to ensure the AI response is visible
        setTimeout(() => {
          // Check if we're still in the right step
          if (localStorage.getItem('tutorialStep') !== 'planSubmitted') return;
          
          // Update step
          localStorage.setItem('tutorialStep', 'reflectionPrompt');
          
          // Add the reflection message with feedback form
          const reflectionMessage = "Now that you've planned something for the future, let's do a little reflecting on the past.\n\nWhat's a hangout you really enjoyed recently? Let's relive it together - it'll help me get to know you as well.\n\nIf you connected your calendar, you should see some recent events populate below. Feel free to choose one, or tell me about something off the books entirely:";
          
          // Add the reflection message to the UI with the feedback form
          setMessages(prev => [...prev, { 
            content: reflectionMessage, 
            isAl: true,
            is_onboarding_message: true,
            showFeedbackForm: true,
            onFeedbackSubmit: handleTutorialFeedbackSubmit,
            feedbackStep: "event-selection"
          }]);
          
          // Save the reflection message to chat history
          supabase
            .from('chat_history')
            .insert([{
              message: JSON.stringify({
                text: reflectionMessage
              }),
              is_ai: true,
              user_id: session.user.id,
              is_onboarding_message: true,
              typewriter_played: true
            }]);
        }, 2000); // Wait 2 seconds after AI response before showing reflection prompt
      } catch (error) {
        console.error('Error in tutorial plan flow:', error);
        // Remove loading message if there was an error
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      }
    }
  };

  const handleGoalSubmit = (message: string) => {
    handleSend(message);
    setIsGoalsOpen(false);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (prompt === "plan me a hang") {
      // Add a message from the user indicating they want to plan
      setMessages(prev => [...prev, { 
        content: "I'd like to plan a hang", 
        isAl: false 
      }]);
      // Add AI response with the planning form
      setMessages(prev => [...prev, { 
        content: "Let's do it.\n\nAny thoughts on who, what, when, or where? Let me know - I'll help with any blanks.\n\nI can also come up with something for you from scratch.", 
        isAl: true,
        showPlanningForm: true,
        onPlanningSubmit: handlePlanSubmit,
        defaultContacts: selectedContact ? [selectedContact] : [],
        defaultActivity: selectedActivity
      }]);
    } else if (prompt === "talk about past hang") {
      handleSend("talk about past hang");
    } else if (prompt === "add a new contact") {
      setIsContactsOpen(true);
    } else {
      handleSend(prompt);
    }
  };

  const handleTutorialComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          has_completed_tutorial: true 
        })
        .eq('id', session?.user?.id);

      // Mark tutorial as complete but don't clear messages
      setTutorialComplete(true);
      setConversationType(ConversationType.CHAT);
      setShowProfileButton(true);
      
      // Don't change preventHistoryLoad - keep it true
      // This prevents the chat history from being reloaded and clearing messages
    } catch (error) {
      console.error('Error completing tutorial:', error);
      toast({
        title: "Error completing tutorial",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRestartOnboarding = async () => {
    if (!session?.user.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: false,
          has_completed_tutorial: false,
          onboarding_step: 'initial',
          personality_traits: {},
          personality_comments: [],
          current_interests: [],
          desired_interests: [],
          goals: [],
          display_name: null,
          age: null,
          city: null,
          languages: [],
          relationship_status: null,
          gender: null,
          occupation: null
        })
        .eq('id', session.user.id);

      setShowOnboarding(true);
      setTutorialComplete(false);
      setShowProfileButton(false);
      
      toast({
        title: "Onboarding restarted",
        description: "Let's start fresh!",
      });
    } catch (error: any) {
      console.error('Error restarting onboarding:', error);
      toast({
        title: "Error restarting onboarding",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  let cleanup: () => void | undefined;

  const defaultPrompts = [
    { text: "Plan", action: "plan me a hang" },
    { text: "Reflect", action: "talk about past hang" }
  ];

  const handleDateTimeSubmit = () => {
    if (selectedDate && selectedTime) {
      const formattedDate = format(selectedDate, 'MMMM do, yyyy');
      handleSend(`I would like to meet on ${formattedDate} at ${selectedTime}`);
      setShowDatePicker(false);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)] px-[env(safe-area-inset-right)] pb-4 px-[env(safe-area-inset-left)]">
          <div className="container max-w-2xl mx-auto">
            <MainNavigation
              isConnectingCalendar={isConnectingCalendar}
              setIsConnectingCalendar={setIsConnectingCalendar}
              onProfileOpen={() => setIsProfileOpen(true)}
              onGoogleSignIn={handleGoogleSignIn}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-8">
        {showOnboarding ? (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        ) : !tutorialComplete ? (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            onSuggestedPrompt={handleSuggestedPrompt}
            suggestedPrompts={[]}
          >
            <></>
          </ChatContainer>
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            onSuggestedPrompt={handleSuggestedPrompt}
            suggestedPrompts={defaultPrompts}
          >
            <></>
          </ChatContainer>
        )}
      </main>

      <div className="fixed bottom-4 left-4 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleStartTutorial}
        >
          <Play className="h-4 w-4" />
          Start Tutorial
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleSkipOnboarding}
        >
          Skip Onboarding and Tutorial (Dev Only)
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRestartOnboarding}
        >
          <Redo className="h-4 w-4" />
          Restart Onboarding
        </Button>
        
        <div className="h-px bg-border my-2" />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestMorningCheckin}
        >
          <Play className="h-4 w-4" />
          Test Morning Check-in
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestEveningCheckin}
        >
          <Play className="h-4 w-4" />
          Test Evening Check-in
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleTestCompletedEvents}
        >
          <RefreshCw className="h-4 w-4" />
          Test Completed Events
        </Button>
      </div>

      <Profile 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen}
      />
      <FeedbackDialog
        open={isFeedbackOpen}
        onOpenChange={setIsFeedbackOpen}
        onSubmit={handleSend}
      />
      <GoalsDialog
        open={isGoalsOpen}
        onOpenChange={setIsGoalsOpen}
        onSubmit={handleGoalSubmit}
      />
      <ContactsDialog
        open={isContactsOpen}
        onOpenChange={setIsContactsOpen}
        onSubmit={handleSend}
        userId={session?.user.id}
      />
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
        Pick a date and time for your hang!
          <div className="flex flex-col gap-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleDateTimeSubmit}
              disabled={!selectedDate || !selectedTime}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
