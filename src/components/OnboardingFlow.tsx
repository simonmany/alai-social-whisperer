import { useState, useEffect } from "react";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BasicInfo } from "@/components/onboarding/BasicInfo";
import { DemographicsSection } from "@/components/onboarding/DemographicsSection";
import { InterestSelector } from "@/components/InterestSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, SkipForward, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingState, AIPreferencesResponse } from "@/types/onboarding";
import { Capacitor } from "@capacitor/core";
import { Contacts } from '@skektec/capacitor-contacts';
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import { synchronizeEvents } from "@/utils/calendar";

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 
  | 'basic' 
  | 'calendar'
  | 'contacts'
  | 'priority-people'
  | 'interests'
  | 'future-interests'
  | 'demographics';

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<OnboardingStep>('basic');
  const [state, setState] = useState<OnboardingState>({});
  const { session } = useAuth();
  const { toast } = useToast();
  const [aiPreferencesResponse, setAiPreferencesResponse] = useState<string | AIPreferencesResponse>("");
  const [isLoadingPreferencesAi, setIsLoadingPreferencesAi] = useState(false);
  const [hasPlayedTypewriter, setHasPlayedTypewriter] = useState(false);
  const [hasPlayedFollowUp, setHasPlayedFollowUp] = useState(false);
  const [hasPlayedIntroLine, setHasPlayedIntroLine] = useState(false);
  const [hasPlayedPredictionLine, setHasPlayedPredictionLine] = useState(false);
  const followUpText = "Now, what are some **new** things you'd like to try?";
  const [hasPlayedLine1, setHasPlayedLine1] = useState(false);
  const [hasPlayedLine2, setHasPlayedLine2] = useState(false);
  const [hasPlayedLine3, setHasPlayedLine3] = useState(false);
  const [hasPlayedLine4, setHasPlayedLine4] = useState(false);
  const [hasPlayedLine5, setHasPlayedLine5] = useState(false);
  const [isAnalyzingInterests, setIsAnalyzingInterests] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showFutureActivities, setShowFutureActivities] = useState(false);
  const [showFutureFood, setShowFutureFood] = useState(false);
  const [showFutureMusic, setShowFutureMusic] = useState(false);
  const [priorityPerson, setPriorityPerson] = useState("");
  const [otherPeople, setOtherPeople] = useState("");
  const [showPriorityInput, setShowPriorityInput] = useState(false);
  const [showOtherPeopleInput, setShowOtherPeopleInput] = useState(false);
  const [priorityLine1, setPriorityLine1] = useState(false);
  const [priorityLine2, setPriorityLine2] = useState(false);
  const [priorityLine3, setPriorityLine3] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);
  const [hasPlayedActivitiesIntro1, setHasPlayedActivitiesIntro1] = useState(false);
  const [hasPlayedActivitiesIntro2, setHasPlayedActivitiesIntro2] = useState(false);
  const [hasPlayedActivitiesIntro, setHasPlayedActivitiesIntro] = useState(false);
  const [hasPlayedFoodIntro, setHasPlayedFoodIntro] = useState(false);
  const [priorityPersonName, setPriorityPersonName] = useState("");
  const [hasPlayedLine3Part1, setHasPlayedLine3Part1] = useState(false);
  const [hasPlayedLine3Part2, setHasPlayedLine3Part2] = useState(false);
  const [hasPlayedLine3Part3, setHasPlayedLine3Part3] = useState(false);
  const [hasPlayedLine3Part4, setHasPlayedLine3Part4] = useState(false);
  const [hasPlayedLine3Part5, setHasPlayedLine3Part5] = useState(false);
  const [hasPlayedLine3Part6, setHasPlayedLine3Part6] = useState(false);
  const [hasPlayedLine3Part7, setHasPlayedLine3Part7] = useState(false);
  const [hasPlayedLine3Part8, setHasPlayedLine3Part8] = useState(false);

  const [contacts, setContacts] = useState<Array<{id: string, name: string, phone?: string}>>([]);
  const [filteredContacts, setFilteredContacts] = useState<Array<{id: string, name: string, phone?: string}>>([]);

  useEffect(() => {
    const fetchPriorityPerson = async () => {
      if (!session?.user?.id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('catch_up_contacts')
          .eq('id', session.user.id)
          .single();

        if (profile?.catch_up_contacts?.[0]) {
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('name')
            .eq('id', profile.catch_up_contacts[0])
            .single();
          
          if (contactError) throw contactError;

          if (contact) {
            setPriorityPersonName(contact.name);
            setPriorityPerson(contact.name);
          }
        }
      } catch (error: any) {
        console.error('Error fetching priority person:', error);
      }
    };

    fetchPriorityPerson();
  }, [session?.user?.id, step]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error fetching contacts:', error);
        return;
      }
      
      setContacts(data || []);
      setFilteredContacts(data || []);
    };
    
    fetchContacts();
  }, [session?.user?.id]);

  const handleBack = () => {
    switch (step) {
      case 'contacts':
        setStep('basic');
        break;
      case 'calendar':
        setStep('contacts');
        break;
      case 'priority-people':
        setStep('calendar');
        break;
      case 'interests':
        setStep('priority-people');
        break;
      case 'future-interests':
        setStep('interests');
        break;
      case 'demographics':
        setStep('future-interests');
        break;
    }
  };

  const handleSkip = async () => {
    if (!session?.user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_started_at: new Date().toISOString(),
          onboarding_step: 'splash',
          has_completed_tutorial: false
        })
        .eq('id', session?.user?.id);

      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error completing onboarding",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleFinishOnboarding = async () => {
    console.log('handleFinishOnboarding called');
    if (!session?.user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_started_at: new Date().toISOString(),
          onboarding_step: 'splash',
          has_completed_tutorial: false,
          desired_interests: [...state.currentInterests || [], 
                     ...state.desiredInterests || [],
                     ...state.foodPreferences || [],
                     ...state.desiredFoodPreferences || [],
                     ...state.musicPreferences || [],
                     ...state.desiredMusicPreferences || []
                    ].filter(Boolean)
        })
        .eq('id', session?.user?.id);

      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error completing onboarding",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const canProceedToNextSection = (section: 'current' | 'future') => {
    if (section === 'current') {
      return !!(state.currentInterests?.length || state.foodPreferences?.length || state.musicPreferences?.length);
    } else {
      return !!(state.desiredInterests?.length || state.desiredFoodPreferences?.length || state.desiredMusicPreferences?.length);
    }
  };

  const showBackButton = step !== 'basic';
  const showSkipButton = ['interests', 'future-interests'].includes(step);

  const handleInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    setState(prev => {
      const newState = { ...prev };
      switch (category) {
        case 'activities':
          newState.currentInterests = selections;
          break;
        case 'food':
          newState.foodPreferences = selections;
          break;
        case 'music':
          newState.musicPreferences = selections;
          break;
      }
      return newState;
    });
  };

  const handleFutureInterestComplete = (category: 'activities' | 'food' | 'music') => (selections: string[]) => {
    setState(prev => {
      const newState = { ...prev };
      switch (category) {
        case 'activities':
          newState.desiredInterests = selections;
          break;
        case 'food':
          newState.desiredFoodPreferences = selections;
          break;
        case 'music':
          newState.desiredMusicPreferences = selections;
          break;
      }
      return newState;
    });
  };

  const handleFollowUpComplete = () => {
    setHasPlayedFollowUp(true);
    setShowFutureActivities(true);
    setTimeout(() => setShowFutureFood(true), 500);
    setTimeout(() => setShowFutureMusic(true), 1000);
  };

  const handlePriorityPersonSubmit = async () => {
    if (!priorityPerson.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .upsert({
          name: priorityPerson.trim(),
          user_id: session?.user.id
        })
        .select()
        .single();

      if (contactError) throw contactError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          catch_up_contacts: [contact.id]
        })
        .eq('id', session?.user?.id);

      if (profileError) throw profileError;

      setPriorityPersonName(contact.name);
      setShowOtherPeopleInput(true);
      setPriorityLine3(true);
      setPriorityPerson(priorityPerson.trim());
      setHasSubmittedOnce(true);
    } catch (error: any) {
      toast({
        title: "Error adding contact",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtherPeopleSubmit = async () => {
    if (otherPeople.trim()) {
      setIsSubmitting(true);
      try {
        const names = otherPeople
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        const contacts = names.map(name => ({
          name,
          user_id: session?.user.id
        }));

        const { error } = await supabase
          .from('contacts')
          .insert(contacts);

        if (error) throw error;
      } catch (error: any) {
        toast({
          title: "Error adding contacts",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
    
    setStep('interests');
  };

  const capitalizeFirstLetter = (str: string = "") => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        {showBackButton && (
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {showSkipButton && (
          <Button variant="ghost" onClick={handleSkip} className="ml-auto">
            Skip
            <SkipForward className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden space-y-4 mb-4">
        {step === 'basic' && (
          <BasicInfo 
            session={session} 
            onComplete={(name) => {
              setState(prev => ({ ...prev, name }));
              setStep('contacts');
            }}
            initialName={state.name}
          />
        )}

        {step === 'contacts' && (
          <div className="space-y-8">
            {hasPlayedLine1 ? (
              <div className="text-xl">{`Nice to meet you, ${capitalizeFirstLetter(state.name)}.`}</div>
            ) : (
              <TypewriterText
                key="line1"
                text={`Nice to meet you, ${capitalizeFirstLetter(state.name)}.`}
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedLine1(true)}
                className="text-xl"
              />
            )}

            {hasPlayedLine1 && (
              <div className="text-xl space-y-2">
                {hasPlayedLine3Part1 ? (
                  <div>My goal is to help you be intentional about your relationships. That includes:</div>
                ) : (
                  <TypewriterText
                    key="line3-part1"
                    text="My goal is to help you be intentional about your relationships. That includes:"
                    delay={250}
                    typingSpeed={25}
                    onComplete={() => setHasPlayedLine3Part1(true)}
                  />
                )}

                {hasPlayedLine3Part1 && (
                  <ul className="list-none space-y-2 mt-4 ml-4">
                    {hasPlayedLine3Part2 ? (
                      <li>- best friends</li>
                    ) : (
                      <TypewriterText
                        key="line3-part2"
                        text="- best friends"
                        delay={250}
                        typingSpeed={25}
                        onComplete={() => setHasPlayedLine3Part2(true)}
                      />
                    )}

                    {hasPlayedLine3Part2 && (
                      hasPlayedLine3Part3 ? (
                        <li>- new friends</li>
                      ) : (
                        <TypewriterText
                          key="line3-part3"
                          text="- new friends"
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => setHasPlayedLine3Part3(true)}
                        />
                      )
                    )}

                    {hasPlayedLine3Part3 && (
                      hasPlayedLine3Part4 ? (
                        <li>- old friends</li>
                      ) : (
                        <TypewriterText
                          key="line3-part4"
                          text="- old friends"
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => setHasPlayedLine3Part4(true)}
                        />
                      )
                    )}

                    {hasPlayedLine3Part4 && (
                      hasPlayedLine3Part5 ? (
                        <li>- family</li>
                      ) : (
                        <TypewriterText
                          key="line3-part5"
                          text="- family"
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => setHasPlayedLine3Part5(true)}
                        />
                      )
                    )}

                    {hasPlayedLine3Part5 && (
                      hasPlayedLine3Part6 ? (
                        <li>- lovers</li>
                      ) : (
                        <TypewriterText
                          key="line3-part6"
                          text="- lovers"
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => setHasPlayedLine3Part6(true)}
                        />
                      )
                    )}

                    {hasPlayedLine3Part6 && (
                      hasPlayedLine3Part7 ? (
                        <li>- work connections</li>
                      ) : (
                        <TypewriterText
                          key="line3-part7"
                          text="- work connections"
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => setHasPlayedLine3Part7(true)}
                        />
                      )
                    )}

                    {hasPlayedLine3Part7 && (
                      hasPlayedLine3Part8 ? (
                        <li>- and people you haven't even met yet.</li>
                      ) : (
                        <TypewriterText
                          key="line3-part8"
                          text="- and people you haven't even met yet."
                          delay={250}
                          typingSpeed={25}
                          onComplete={() => {
                            setHasPlayedLine3Part8(true);
                            setHasPlayedLine3(true);
                          }}
                        />
                      )
                    )}
                  </ul>
                )}
              </div>
            )}

            {hasPlayedLine3 && (
              hasPlayedLine4 ? (
                <div className="text-xl">It's a lot to process - that's why I'm here.</div>
              ) : (
                <TypewriterText
                  key="line4"
                  text="It's a lot to process - that's why I'm here."
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine4(true)}
                  className="text-xl"
                />
              )
            )}

            {hasPlayedLine4 && (
              hasPlayedLine5 ? (
                <div className="text-xl">Connect your contacts to get started - I'll never share your info with anyone else.</div>
              ) : (
                <TypewriterText
                  key="line5"
                  text="Connect your contacts to get started - I'll never share your info with anyone else."
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => setHasPlayedLine5(true)}
                  className="text-xl"
                />
              )
            )}

            {hasPlayedLine5 && (
              <div className="flex flex-col space-y-4 mt-8">
                {Capacitor.isNativePlatform() && (
                  <Button 
                    onClick={async () => {
                      try {
                        const result = await Contacts.getContacts({
                          projection: {
                            name: true,
                            phones: true,
                            postalAddresses: true,
                          },
                        });
                        
                        if (result.contacts && result.contacts.length > 0) {
                          setIsSubmitting(true);
                          const contactsToInsert = result.contacts.map(contact => ({
                            user_id: session?.user?.id,
                            name: contact.name?.display || 'Unknown',
                            phone: contact.phones?.[0]?.number,
                            address: contact.postalAddresses?.[0]?.formatted,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          }));

                          const { error } = await supabase
                            .from('contacts')
                            .insert(contactsToInsert);

                          if (error) {
                            throw error;
                          }

                          toast({
                            title: "Contacts Synchronized",
                            description: `Successfully imported ${result.contacts.length} contacts`,
                          });
                          setStep('calendar');
                        } else {
                          toast({
                            title: "No Contacts Found",
                            description: "Your contact list is empty",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to sync contacts: " + (error instanceof Error ? error.message : JSON.stringify(error)),
                          variant: "destructive",
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Syncing Contacts..." : "Connect Contacts"}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setStep('calendar')}
                  className="w-full"
                >
                  {Capacitor.isNativePlatform() ? "Not Now" : "Continue"}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'calendar' && (
          <div className="space-y-8">
            {hasPlayedLine4 ? (
              <div className="text-xl">
                Now that I know who you know, I'd love to help you find the perfect time to meet them! Connect your calendar to help me schedule events.
              </div>
            ) : (
              <TypewriterText
                key="calendar-intro"
                text="Now that I know who you know, I'd love to help you find the perfect time to meet them! Connect your calendar to help me schedule events."
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedLine4(true)}
                className="text-xl"
              />
            )}

            <div className="flex flex-col space-y-4 mt-8">
              {Capacitor.isNativePlatform() && (
                <Button 
                  onClick={async () => {
                    try {
                      const { result } = await CapacitorCalendar.requestFullCalendarAccess();
                      console.log('request result:', result);
                      
                      if (result === 'granted') {
                        const { result: calendars } = await CapacitorCalendar.listCalendars();
                        console.log('available calendars:', calendars);
                        
                        if (calendars && calendars.length > 0) {
                          toast({
                            title: "Calendar Connected",
                            description: `Found ${calendars.length} calendars`,
                          });
                        
                          // import events from all calendars and store in supabase
                          const now = new Date()
                          const month_from_now = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                          const { result: events } = await CapacitorCalendar.listEventsInRange({ from: now.getTime(), to: month_from_now.getTime() });
                          console.log('first event:', JSON.stringify(events[0], null, 2));
                          
                          if (events && events.length > 0) {
                            synchronizeEvents(session.user.id);
                          }
                          
                          
                          setStep('priority-people');
                        } else {
                          toast({
                            title: "No Calendars Found",
                            description: "No calendars were found on your device",
                            variant: "destructive",
                          });
                        }
                      } else {
                        toast({
                          title: "Permission Denied",
                          description: "Calendar access is required to help schedule your events",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      console.error('Calendar sync error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to connect calendar: " + (error instanceof Error ? error.message : JSON.stringify(error)),
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  Connect Calendar
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => setStep('priority-people')}
                className="w-full"
              >
                {Capacitor.isNativePlatform() ? "Not Now" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 'priority-people' && (
          <div className="space-y-8">
            {hasPlayedIntroLine ? (
              <div className="text-xl">
                I'm all about helping you see the people you want to see.
              </div>
            ) : (
              <TypewriterText
                key="intro"
                text="I'm all about helping you see the people you want to see."
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedIntroLine(true)}
                className="text-xl"
              />
            )}

            {hasPlayedIntroLine && (
              hasPlayedPredictionLine ? (
                <div className="text-xl">
                  Over time, I'll get better at predicting this, but we've only just met -
                </div>
              ) : (
                <TypewriterText
                  key="prediction"
                  text="Over time, I'll get better at predicting this, but we've only just met -"
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => {
                    setHasPlayedPredictionLine(true);
                    setPriorityLine1(true);
                    setPriorityLine2(true);
                  }}
                  className="text-xl"
                />
              )
            )}

            {priorityLine2 && (
              <>
                {showPriorityInput ? (
                  <div className="text-xl">
                    So, without thinking too hard, who's the first person you want to see?
                  </div>
                ) : (
                  <TypewriterText
                    key="priority2"
                    text="So, without thinking too hard, who's the first person you want to see?"
                    delay={250}
                    typingSpeed={25}
                    onComplete={() => setShowPriorityInput(true)}
                    className="text-xl"
                  />
                )}

                {showPriorityInput && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        value={priorityPerson}
                        onChange={(e) => {
                          const searchTerm = e.target.value;
                          setPriorityPerson(searchTerm);
                          
                          // Filter contacts based on search term
                          if (searchTerm.trim()) {
                            const filtered = contacts.filter(contact =>
                              contact.name.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                            setFilteredContacts(filtered);
                          } else {
                            setFilteredContacts(contacts);
                          }
                        }}
                        placeholder="Enter name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && priorityPerson.trim()) {
                            e.preventDefault();
                            handlePriorityPersonSubmit();
                          }
                        }}
                      />
                      {priorityPerson.trim() && filteredContacts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
                          {filteredContacts.map(contact => (
                            <div
                              key={contact.id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setPriorityPerson(contact.name);
                                setFilteredContacts([]);
                              }}
                            >
                              <div className="font-medium">{contact.name}</div>
                              {contact.phone && (
                                <div className="text-sm text-gray-500">{contact.phone}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handlePriorityPersonSubmit}
                      className="w-full"
                      disabled={!priorityPerson.trim() || isSubmitting}
                      variant={hasSubmittedOnce ? "outline" : "default"}
                    >
                      {hasSubmittedOnce ? "Update" : "Submit"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {priorityLine3 && (
              <>
                {showOtherPeopleInput ? (
                  <div className="text-xl">
                    Got it. Did anyone else come to mind? Feel free to add as many as you like.
                  </div>
                ) : (
                  <TypewriterText
                    key="priority3"
                    text="Got it. Did anyone else come to mind? Feel free to add as many as you like."
                    delay={250}
                    typingSpeed={25}
                    onComplete={() => setShowOtherPeopleInput(true)}
                    className="text-xl"
                  />
                )}

                {showOtherPeopleInput && (
                  <div className="space-y-4">
                    <Textarea
                      value={otherPeople}
                      onChange={(e) => setOtherPeople(e.target.value)}
                      placeholder="Enter names (separated by commas)"
                    />
                    <Button 
                      onClick={handleOtherPeopleSubmit}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {otherPeople.trim() ? "Submit" : "Skip"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 'interests' && (
          <div className="space-y-8">
            {hasPlayedActivitiesIntro1 ? (
              <div className="text-xl">
                Nice. Since {priorityPersonName} is the first person that came to mind, let's plan something fun with them.
              </div>
            ) : (
              <TypewriterText
                key="activities-intro1"
                text={`Nice. Since ${priorityPersonName} is the first person that came to mind, let's plan something fun with them.`}
                delay={250}
                typingSpeed={25}
                onComplete={() => setHasPlayedActivitiesIntro1(true)}
                className="text-xl"
              />
            )}

            {hasPlayedActivitiesIntro1 && (
              hasPlayedActivitiesIntro2 ? (
                <div className="text-xl">
                  What are some activities you might enjoy doing together?
                </div>
              ) : (
                <TypewriterText
                  key="activities-intro2"
                  text="What are some activities you might enjoy doing together?"
                  delay={250}
                  typingSpeed={25}
                  onComplete={() => {
                    setHasPlayedActivitiesIntro2(true);
                    setShowActivities(true);
                  }}
                  className="text-xl"
                />
              )
            )}

            {showActivities && (
              <div>
                <InterestSelector
                  type="activities"
                  onComplete={(selections) => {
                    setState(prev => ({ ...prev, currentInterests: selections }));
                  }}
                  placeholder="Type to search activities..."
                  minSelections={1}
                  value={state.currentInterests}
                  onChange={(selections) => {
                    setState(prev => ({ ...prev, currentInterests: selections }));
                  }}
                />
              </div>
            )}

            {(state.currentInterests?.length ?? 0) > 0 && (
              <Button 
                onClick={handleFinishOnboarding}
                className="w-full mt-8"
              >
                Finish
              </Button>
            )}
          </div>
        )}

        {step === 'future-interests' && (
          <div className="space-y-8">
            <div className="space-y-8">
              {isLoadingPreferencesAi ? (
                <div className="text-lg animate-pulse">
                  Thinking about your interests...
                </div>
              ) : aiPreferencesResponse ? (
                <div className="space-y-8">
                  <div className="text-lg bg-primary/5 p-6 rounded-lg">
                    {hasPlayedTypewriter ? (
                      <div>
                        {typeof aiPreferencesResponse === 'string' 
                          ? aiPreferencesResponse 
                          : aiPreferencesResponse.response}
                      </div>
                    ) : (
                      <TypewriterText
                        key="preferences"
                        text={typeof aiPreferencesResponse === 'string' 
                          ? aiPreferencesResponse 
                          : aiPreferencesResponse.response}
                        delay={250}
                        typingSpeed={25}
                        onComplete={() => setHasPlayedTypewriter(true)}
                      />
                    )}
                  </div>
                  <div className="text-lg mb-16">
                    {hasPlayedFollowUp ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: followUpText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                      }} />
                    ) : (
                      <TypewriterText
                        key="followup"
                        text={followUpText}
                        delay={250}
                        typingSpeed={25}
                        onComplete={handleFollowUpComplete}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              <div>
                <div className={cn(
                  "transition-opacity duration-500",
                  showFutureActivities ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Activities & Hobbies</h3>
                  <InterestSelector
                    type="activities"
                    onComplete={handleFutureInterestComplete('activities')}
                    placeholder="Type activities you'd like to try..."
                    minSelections={1}
                    value={state.desiredInterests}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredInterests: selections }));
                    }}
                  />
                </div>

                <div className={cn(
                  "transition-opacity duration-500 mt-8",
                  showFutureFood ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Food Preferences</h3>
                  <InterestSelector
                    type="food"
                    onComplete={handleFutureInterestComplete('food')}
                    placeholder="Type cuisines you'd like to try..."
                    minSelections={1}
                    value={state.desiredFoodPreferences}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredFoodPreferences: selections }));
                    }}
                  />
                </div>

                <div className={cn(
                  "transition-opacity duration-500 mt-8",
                  showFutureMusic ? "opacity-100" : "opacity-0"
                )}>
                  <h3 className="text-base font-medium mb-4">Music Preferences</h3>
                  <InterestSelector
                    type="music"
                    onComplete={handleFutureInterestComplete('music')}
                    placeholder="Type music genres you'd like to explore..."
                    minSelections={1}
                    value={state.desiredMusicPreferences}
                    onChange={(selections) => {
                      setState(prev => ({ ...prev, desiredMusicPreferences: selections }));
                    }}
                  />
                </div>
              </div>

              {canProceedToNextSection('future') && (
                <Button 
                  onClick={() => setStep('demographics')}
                  className="w-full mt-8"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'demographics' && (
          <DemographicsSection 
            session={session} 
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
