# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/228287c8-645d-4d08-a95c-ff345da3d67e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/228287c8-645d-4d08-a95c-ff345da3d67e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Setup

### Frontend Environment
Copy `.env.example` to `.env` and update the values:
```sh
cp .env.example .env
```

### Edge Functions Environment
For local development of Supabase Edge Functions:

1. Copy the Deno environment template:
```sh
cp .env.deno.example .env.deno
```

2. Update the values in `.env.deno` with your credentials:
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- Other function-specific variables

3. Run edge functions locally:
```sh
./supabase/functions/start-local.sh <function-name>
```
Example:
```sh
./supabase/functions/start-local.sh email-calendar-auth
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
  - Edge Functions (Deno)
  - Auth
  - Database

## Edge Functions

The project uses Supabase Edge Functions for server-side operations:

- `email-calendar-auth`: Handles OAuth flow for email users
- `calendar`: Manages calendar operations
- `store_auth`: Handles auth token storage

Each function has its own configuration in `supabase/functions/config.toml`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/228287c8-645d-4d08-a95c-ff345da3d67e) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
