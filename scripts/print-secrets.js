import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('\nSupabase Edge Function Secrets Setup Instructions');
console.log('==============================================');
console.log('\nPlease set the following secrets in your Supabase dashboard:');
console.log('https://supabase.com/dashboard/project/ejqucnzpgebbujlnmdzx/settings/functions\n');

const secrets = {
  'SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'DB_URL': process.env.SUPABASE_URL,
  'ANON_KEY': process.env.SUPABASE_ANON_KEY
};

Object.entries(secrets).forEach(([key, value]) => {
  if (!value) {
    console.log(`⚠️  Missing ${key} in environment variables`);
    return;
  }

  console.log(`${key}:`);
  console.log(`${value}\n`);
});

console.log('\nAfter setting the secrets, redeploy the functions:');
console.log('------------------------------------------------');
console.log('Run these commands:\n');
['store_auth', 'calendar'].forEach(func => {
  console.log(`supabase functions deploy ${func} --project-ref ejqucnzpgebbujlnmdzx --no-verify-jwt`);
});

console.log('\nMake sure to set these secrets for all functions listed above.');