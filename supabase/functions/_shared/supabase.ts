import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('DB_URL');
const supabaseServiceKey = Deno.env.get('DB_SERVICE_ROLE_KEY');
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing environment variables');
}
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseServiceKey ?? ''
);