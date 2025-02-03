import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

const PROJECT_ID = 'ejqucnzpgebbujlnmdzx';
const FUNCTIONS = ['store_auth', 'calendar'];

async function setupSecrets() {
  try {
    console.log('Setting up Edge Function secrets...');

    // Verify required environment variables
    const requiredVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Set secrets for each function
    for (const func of FUNCTIONS) {
      console.log(`\nSetting secrets for ${func} function...`);

      try {
        // Set service role key with a different name
        await execAsync(`supabase secrets set --project-ref ${PROJECT_ID} SERVICE_ROLE_KEY="${process.env.SUPABASE_SERVICE_ROLE_KEY}"`);
        console.log('✓ Set SERVICE_ROLE_KEY');

        // Set URL with a different name
        await execAsync(`supabase secrets set --project-ref ${PROJECT_ID} DB_URL="${process.env.SUPABASE_URL}"`);
        console.log('✓ Set DB_URL');

        // Set anon key with a different name
        await execAsync(`supabase secrets set --project-ref ${PROJECT_ID} ANON_KEY="${process.env.SUPABASE_ANON_KEY}"`);
        console.log('✓ Set ANON_KEY');

        // Redeploy the function
        await execAsync(`supabase functions deploy ${func} --project-ref ${PROJECT_ID} --no-verify-jwt`);
        console.log(`✓ Redeployed ${func} function`);

      } catch (error) {
        console.error(`Error setting secrets for ${func}:`, error.message);
        throw error;
      }
    }

    console.log('\nAll secrets set successfully!');
    console.log('\nVerifying secrets...');

    // Create Supabase client to verify
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test auth endpoint
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      throw new Error(`Failed to verify service role key: ${error.message}`);
    }

    console.log('✓ Service role key verified successfully');
    console.log('\nSetup complete! You can now use the Edge Functions.');

  } catch (error) {
    console.error('\nError during setup:', error);
    process.exit(1);
  }
}

setupSecrets().catch(console.error);