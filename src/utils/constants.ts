// Application-wide constants that are not sensitive
export const APP_CONSTANTS = {
    // Add application name and version
    APP_NAME: 'ALAI Social Whisperer',
    APP_VERSION: '0.0.0',

    // API endpoints and base URLs (non-sensitive)
    BACKEND_URL: 'https://ejqucnzpgebbujlnmdzx.supabase.co',
    SITE_URL: import.meta.env.PROD ? 'https://preview--alai-social-whisperer.lovable.app' : 'http://localhost:8080',

    // Time constants
    SESSION_TIMEOUT_MINUTES: 60,
    REFRESH_INTERVAL_MS: 5000,
} as const;

// Type for our constants to ensure type safety
export type AppConstants = typeof APP_CONSTANTS;
