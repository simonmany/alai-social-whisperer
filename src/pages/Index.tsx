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
import { format } from "date-fns";
import { TIME_OPTIONS } from "@/utils/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Message, ChatHistoryMessage } from "@/types/chat";

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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [conversationType, setConversationType] = useState(ConversationType.CHAT)

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
      if (!session?.user?.id) return;

      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', startOfDay)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const historyMessages = await Promise.all((data as ChatHistoryMessage[]).map(async msg => {
            const message: Message = {
              content: msg.message,
              isAl: msg.is_ai,
              is_secret: msg.is_secret,
              eventId: msg.event_id,
              eventTitle: msg.event_title,
              showFeedbackForm: msg.event_id ? true : false,
              showPlanningForm: msg.show_planning_form,
              defaultContacts: msg.default_contact ? [{ name: msg.default_contact }] : undefined,
              defaultActivity: msg.default_activity
            };

            // If this is a post-event message, fetch the event details
            if (msg.event_id) {
              const { data: eventData, error: eventError } = await supabase
                .from('calendar_events')
                .select(`
                  *,
                  event_attendees!left (contacts!contact_id (id, name))
                `)
                .eq('id', msg.event_id)
                .maybeSingle();

              if (eventError) {
                console.error('Error fetching event:', eventError);
              }

              if (eventData && !eventData.feedback_sent) {
                const onFeedbackSubmit = async (feedback: string) => {
                  try {
                    await supabase
                      .from('calendar_events')
                      .update({ 
                        feedback_sent: true, 
                        feedback 
                      })
                      .eq('id', msg.event_id);

                    setMessages(prev => prev.map(m => 
                      m.eventId === msg.event_id 
                        ? { ...m, showFeedbackForm: false }
                        : m
                    ));

                    toast({
                      title: "Feedback submitted",
                      description: "Thank you for your feedback!"
                    });
                  } catch (error) {
                    console.error('Error submitting feedback:', error);
                    toast({
                      title: "Error",
                      description: "Failed to submit feedback",
                      variant: "destructive"
                    });
                  }
                };

                message.completedEvent = eventData;
                message.onFeedbackSubmit = onFeedbackSubmit;
              }
            }

            return message;
          }));
          setMessages(historyMessages);
        } else {
          setMessages([{ 
            content: "Hello! I'm here to help you plan and maintain meaningful connections. What would you like to do?", 
            isAl: true,
          }]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [session?.user?.id, showOnboarding, tutorialComplete]);

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

      const desiredInterest = profileData?.desired_interests[0] || '';

      const welcomeMessage = `Hey ${profileData?.display_name || ''}. Thanks for taking the time to check me out - it means you care about the quality of your relationships and living a full life.\n\nI don't know you well yet, but I like you already.\n\n${contactName ? `Let's dive right in and get started planning your first Hang. You mentioned wanting to see ${contactName}. Let's make that happen!` : "Let's dive right in and get started planning your first Hang!"}`;

      await supabase
        .from('chat_history')
        .insert([{
          message: welcomeMessage,
          is_ai: true,
          user_id: session.user.id,
          is_onboarding_message: true
        }]);
      
      setTutorialComplete(false);
      setShowProfileButton(false);

      // Wait for the real-time subscription to catch up
      await new Promise(resolve => setTimeout(resolve, 100));

      // Force a fresh fetch of messages before adding planning form
      const { data: latestMessages } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (latestMessages) {
        const historyMessages = latestMessages.map(msg => ({
          content: msg.message,
          isAl: msg.is_ai,
          is_secret: msg.is_secret,
        }));
        setMessages(historyMessages);
      }

      // Now add the planning form
      setMessages(prev => [...prev, { 
        content: "", 
        isAl: true,
        showPlanningForm: true,
        onPlanningSubmit: handlePlanSubmit,
        defaultContacts: contactData ? [contactData] : [],
        defaultActivity: desiredInterest
      }]);

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

      setShowOnboarding(false);
      setTutorialComplete(true);
      setShowProfileButton(false);
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
            console.log('New message received - Full payload:', payload.new);
            console.log('New message received - Parsed:', {
              message: payload.new.message,
              is_ai: payload.new.is_ai,
              event_id: payload.new.event_id,
              event_title: payload.new.event_title,
              contact_info: payload.new.contact_info,
              type: typeof payload.new.event_id
            });
            const onFeedbackSubmit = async (feedback: string) => {
              try {
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
              } catch (error) {
                console.error('Error submitting feedback:', error);
                toast({
                  title: "Error",
                  description: "Failed to submit feedback",
                  variant: "destructive"
                });
              }
            };
            
            // If this is a post-event message, fetch the full event details with attendees
            let eventData = null;
            let newMessage: Message = {
              content: payload.new.message,
              isAl: payload.new.is_ai,
              is_secret: payload.new.is_secret,
              defaultContacts: payload.new.contact_info,
              showPlanningForm: false, // Explicitly set this for new messages
              showFeedbackForm: payload.new.event_id ? true : false, // Show feedback form for event messages
              eventId: payload.new.event_id,
              eventTitle: payload.new.event_title,
              onFeedbackSubmit: payload.new.event_id ? onFeedbackSubmit : undefined
            };

            // If this is a post-event message, fetch the event details
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

            // Construct the message with event details and feedback form if needed
            let newMessage = {
              content: payload.new.message,
              isAl: payload.new.is_ai,
              is_secret: payload.new.is_secret,
              contacts: payload.new.contact_info,
              showPlanningForm: false,
              eventId: payload.new.event_id,
              eventTitle: payload.new.event_title,
              completedEvent: eventData || undefined
            };

            // Only show feedback form and submit function if we have an event that hasn't had feedback sent
            if (eventData && !eventData.feedback_sent) {
              newMessage.showFeedbackForm = true;
              newMessage.onFeedbackSubmit = onFeedbackSubmit;
            }
            console.log('Setting new message:', {
              content: newMessage.content,
              isAl: newMessage.isAl,
              showFeedbackForm: newMessage.showFeedbackForm,
              eventId: newMessage.eventId,
              completedEvent: newMessage.completedEvent
            });
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

  const handleFeedbackSubmit = async (message: string) => {
    if (!session?.user?.id) return;

    // Remove the feedback form from messages
    setMessages(prev => prev.filter(msg => !msg.showFeedbackForm));

    setIsLoading(true);
    setMessages(prev => [...prev, { content: message, isAl: false }]);

    try {
      const response = await generateChatResponse(message, [], false, ConversationType.CHAT);
      setMessages(prev => [...prev, { content: response.message, isAl: true }]);
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

  const handleSend = async (message: string, contactInfo?: Contact) => {
    if (!message.trim()) return;

    setIsLoading(true);

    if (message.toLowerCase().includes("talk about past hang")) {
      setMessages(prev => [...prev, 
        { content: message, isAl: false },
        { 
          content: "I'd love to hear about your past hang! Please select an event from below or tell me about something that wasn't on the calendar.", 
          isAl: true,
          showFeedbackForm: true,
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

  const handlePlanSubmit = (message: string, newContent?: string) => {
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
      // Only remove the planning form when submitting the final plan
      setMessages(prev => prev.filter(message => !message.showPlanningForm));
      handleSend(message);
      setTutorialComplete(true);
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
        content: "Sure! Let's plan something. Fill out the details below:", 
        isAl: true,
        showPlanningForm: true,
        onPlanningSubmit: handlePlanSubmit,
        defaultContacts: selectedContact ? [selectedContact] : [],
        defaultActivity: selectedActivity
      }]);
    } else if (prompt === "talk about past hang") {
      handleSend("talk about past hang");
    } else if (prompt === "Set a new goal") {
      setIsGoalsOpen(true);
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

      setTutorialComplete(true);
      setConversationType(ConversationType.CHAT)
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
    { text: "plan a future hang", action: "plan me a hang" },
    { text: "talk about past hang", action: "talk about past hang" },
    { text: "Set a new goal", action: "Set a new goal" },
    { text: "add a new contact", action: "add a new contact" }
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
          Skip Onboarding (Dev Only)
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
