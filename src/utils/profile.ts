export const formatProfileData = (profile: any, session: any) => {
  if (!profile) return null;

  // Format profile data with all calendar-related fields
  const formattedProfile = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    hasGoogleCalendar: profile.has_google_calendar || false,
    googleTokenExpired: profile.google_token_expired || false,
    tokenExpiresAt: profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null,
    hasAccessToken: !!profile.google_access_token,
    hasRefreshToken: !!profile.google_refresh_token,
    updatedAt: profile.updated_at,
    provider: session?.user?.app_metadata?.provider
  };

  // Check if calendar is properly connected and tokens are valid
  const hasValidTokens = formattedProfile.hasGoogleCalendar && !formattedProfile.googleTokenExpired;

  return {
    ...formattedProfile,
    hasValidTokens
  };
};

export const getProfileWithAuth = async (supabase: any, userId: string) => {
  try {
    const [profileResult, sessionResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          *,
          google_access_token,
          google_refresh_token,
          google_token_expires_at,
          has_google_calendar,
          google_token_expired
        `)
        .eq('id', userId)
        .single(),
      supabase.auth.getSession()
    ]);

    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error);
      throw profileResult.error;
    }

    if (!profileResult.data) {
      console.error('No profile found for user:', userId);
      throw new Error('Profile not found');
    }

    // Log profile data for debugging
    console.log('Profile data:', {
      hasGoogleCalendar: profileResult.data.has_google_calendar,
      googleTokenExpired: profileResult.data.google_token_expired,
      hasAccessToken: !!profileResult.data.google_access_token,
      hasRefreshToken: !!profileResult.data.google_refresh_token,
      tokenExpiresAt: profileResult.data.google_token_expires_at,
      provider: sessionResult.data.session?.user?.app_metadata?.provider
    });

    return formatProfileData(profileResult.data, sessionResult.data.session);
  } catch (error) {
    console.error('Error in getProfileWithAuth:', error);
    throw error;
  }
};