import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/auth/v1/callback", async function (req, res) {
  const code = req.query.code
  const next = req.query.next ?? "/"
  console.log("Auth callback:", { code, next })

  if (code) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.req.headers.cookie ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
        )
      },
    },
  })
    await supabase.auth.exchangeCodeForSession(code)
  }

  res.redirect(303, `/${next.slice(1)}`)
})

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});

export const viteNodeApp = app;

