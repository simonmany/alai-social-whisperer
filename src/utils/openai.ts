import { supabase } from "@/integrations/supabase/client";

export const generateChatResponse = async (message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw error;
    }

    if (!data || !data.response) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response from chat function");
    }

    return data.response;

  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
};