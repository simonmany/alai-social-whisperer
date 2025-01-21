import { supabase } from "@/integrations/supabase/client";

export const generateChatResponse = async (message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message }
    });

    if (error) throw error;
    return data.response;

  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm having trouble connecting right now. Please try again later!";
  }
};