import { supabase } from "@/integrations/supabase/client";

export interface ContactInfo {
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meetingStory?: string;
  relationship?: string;
}

export enum ConversationType {
  CHAT = 'CHAT',
  HANG_PLANNER = 'HANG_PLANNER',
  PERSONALITY_ANALYZER = 'PERSONALITY_ANALYZER',
  HANG_GENERATOR = 'HANG_GENERATOR',
}

export const generateChatResponse = async (message: string, contactInfo?: ContactInfo[], secretMessage?: boolean, conversationType: ConversationType = ConversationType.CHAT) => {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message, userId, contactInfo, secretMessage, conversationType }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(error.message || "Failed to generate response");
    }

    if (!data) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response from chat function");
    }

    return data;

  } catch (error) {
    console.error("Error generating chat response:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to generate response");
  }
};

export const generatePersonalityAnalysis = async (message: string) => {
  try {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message, userId, contactInfo: [], secretMessage: true, conversationType: ConversationType.PERSONALITY_ANALYZER }
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(error.message || "Failed to generate analysis");
    }

    if (!data || !data.text) {
      console.error("Invalid response format:", data);
      throw new Error("Invalid response from personality analysis");
    }

    return data.text;

  } catch (error) {
    console.error("Error generating personality analysis:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to generate analysis");
  }
};