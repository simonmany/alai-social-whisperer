// supabase/functions/store_auth/index.ts
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = express();

app.use(express.json());

app.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    console.log('store_auth function received:', name);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in store_auth:', error);
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
