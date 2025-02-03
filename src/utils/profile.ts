interface GoogleTokens {
  access_token: string;
  refresh_token: string;
}

export const isGoogleTokenExpired = (profile: any): boolean => {
  if (!profile?.google_access_token || !profile?.google_token_expires_at) return true;
  
  const expiresAt = new Date(profile.google_token_expires_at);
  return expiresAt < new Date();
};

export const formatProfileData = (profile: any, session: any) => {
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    hasGoogleCalendar: !!profile?.google_access_token,
    googleTokenExpired: isGoogleTokenExpired(profile),
    updatedAt: profile.updated_at
  };
};

export const getProfileWithAuth = async (supabase: any, userId: string) => {
  try {
    const [profileResult, sessionResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, google_access_token, google_refresh_token, google_token_expires_at')
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

    return formatProfileData(profileResult.data, sessionResult.data.session);
  } catch (error) {
    console.error('Error in getProfileWithAuth:', error);
    throw error;
  }
};