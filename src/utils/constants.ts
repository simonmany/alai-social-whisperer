// Application-wide constants that are not sensitive
export const APP_CONSTANTS = {
    // Add application name and version
    APP_NAME: import.meta.env.VITE_APP_NAME || 'ALAI Social Whisperer',
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.0.0',

    // API endpoints and base URLs (non-sensitive)
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://ejqucnzpgebbujlnmdzx.supabase.co',
    ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXVjbnpwZ2ViYnVqbG5tZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MDA3NjgsImV4cCI6MjA1MzA3Njc2OH0.wXBUTxCLlq4vtGnF8ScvGFzZQeJfdYhgzvW6CF3eViI',
    SITE_URL: import.meta.env.VITE_SITE_URL || (import.meta.env.PROD ? 'https://preview--alai-social-whisperer.lovable.app' : 'http://localhost:8080'),

    // Time constants
    SESSION_TIMEOUT_MINUTES: Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 60,
    REFRESH_INTERVAL_MS: Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 5000,
} as const;

// Type for our constants to ensure type safety
export type AppConstants = typeof APP_CONSTANTS;


export const TIME_OPTIONS = [
    "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
    "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
  ];
