import { supabase } from "@/integrations/supabase/client";

export const generateChatResponse = async (message: string) => {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message, userId }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(error.message || "Failed to generate response");
    }

    if (!data || !data.response) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response from chat function");
    }

    return data.response;

  } catch (error) {
    console.error("Error generating chat response:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to generate response");
  }
};