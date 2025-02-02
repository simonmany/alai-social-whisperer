create extension if not exists "pg_net" with schema "public" version '0.14.0';

create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."activities" enable row level security;

create table "public"."calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "description" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "google_event_id" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."calendar_events" enable row level security;

create table "public"."chat_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "message" text not null,
    "is_ai" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."chat_history" enable row level security;

create table "public"."contact_group_memberships" (
    "contact_id" uuid not null,
    "group_id" uuid not null
);


alter table "public"."contact_group_memberships" enable row level security;

create table "public"."contact_groups" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "emoji" text
);


alter table "public"."contact_groups" enable row level security;

create table "public"."contacts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "email" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "closeness" numeric default 0.5,
    "phone" text,
    "instagram" text,
    "linkedin" text,
    "twitter" text,
    "meeting_story" text,
    "relationship" text
);


alter table "public"."contacts" enable row level security;

create table "public"."event_feedback_status" (
    "event_id" uuid not null,
    "feedback_sent" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."event_feedback_status" enable row level security;

create table "public"."food_items" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."food_items" enable row level security;

create table "public"."languages" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."languages" enable row level security;

create table "public"."music_genres" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "category" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."music_genres" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "avatar_url" text,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "google_access_token" text,
    "google_refresh_token" text,
    "google_token_expires_at" timestamp with time zone,
    "display_name" text,
    "onboarding_completed" boolean default false,
    "goals" jsonb default '[]'::jsonb,
    "personality_traits" jsonb default '{}'::jsonb,
    "personality_comments" text[],
    "current_interests" jsonb default '[]'::jsonb,
    "desired_interests" jsonb default '[]'::jsonb,
    "age" integer,
    "city" text,
    "languages" jsonb default '[]'::jsonb,
    "relationship_status" text,
    "gender" text,
    "occupation" text,
    "onboarding_step" text default 'initial'::text,
    "onboarding_started_at" timestamp with time zone,
    "has_completed_tutorial" boolean default false,
    "food_preferences" jsonb default '[]'::jsonb,
    "music_preferences" jsonb default '[]'::jsonb
);


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX activities_name_key ON public.activities USING btree (name);

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE UNIQUE INDEX calendar_events_pkey ON public.calendar_events USING btree (id);

CREATE UNIQUE INDEX chat_history_pkey ON public.chat_history USING btree (id);

CREATE UNIQUE INDEX contact_group_memberships_pkey ON public.contact_group_memberships USING btree (contact_id, group_id);

CREATE UNIQUE INDEX contact_groups_pkey ON public.contact_groups USING btree (id);

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

CREATE UNIQUE INDEX event_feedback_status_pkey ON public.event_feedback_status USING btree (event_id);

CREATE UNIQUE INDEX food_items_name_key ON public.food_items USING btree (name);

CREATE UNIQUE INDEX food_items_pkey ON public.food_items USING btree (id);

CREATE INDEX idx_profiles_goals ON public.profiles USING gin (goals);

CREATE UNIQUE INDEX languages_name_key ON public.languages USING btree (name);

CREATE UNIQUE INDEX languages_pkey ON public.languages USING btree (id);

CREATE UNIQUE INDEX music_genres_name_key ON public.music_genres USING btree (name);

CREATE UNIQUE INDEX music_genres_pkey ON public.music_genres USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."calendar_events" add constraint "calendar_events_pkey" PRIMARY KEY using index "calendar_events_pkey";

alter table "public"."chat_history" add constraint "chat_history_pkey" PRIMARY KEY using index "chat_history_pkey";

alter table "public"."contact_group_memberships" add constraint "contact_group_memberships_pkey" PRIMARY KEY using index "contact_group_memberships_pkey";

alter table "public"."contact_groups" add constraint "contact_groups_pkey" PRIMARY KEY using index "contact_groups_pkey";

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."event_feedback_status" add constraint "event_feedback_status_pkey" PRIMARY KEY using index "event_feedback_status_pkey";

alter table "public"."food_items" add constraint "food_items_pkey" PRIMARY KEY using index "food_items_pkey";

alter table "public"."languages" add constraint "languages_pkey" PRIMARY KEY using index "languages_pkey";

alter table "public"."music_genres" add constraint "music_genres_pkey" PRIMARY KEY using index "music_genres_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."activities" add constraint "activities_name_key" UNIQUE using index "activities_name_key";

alter table "public"."calendar_events" add constraint "calendar_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_user_id_fkey";

alter table "public"."chat_history" add constraint "chat_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."chat_history" validate constraint "chat_history_user_id_fkey";

alter table "public"."contact_group_memberships" add constraint "contact_group_memberships_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE not valid;

alter table "public"."contact_group_memberships" validate constraint "contact_group_memberships_contact_id_fkey";

alter table "public"."contact_group_memberships" add constraint "contact_group_memberships_group_id_fkey" FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE not valid;

alter table "public"."contact_group_memberships" validate constraint "contact_group_memberships_group_id_fkey";

alter table "public"."contact_groups" add constraint "contact_groups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."contact_groups" validate constraint "contact_groups_user_id_fkey";

alter table "public"."contacts" add constraint "contacts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."contacts" validate constraint "contacts_user_id_fkey";

alter table "public"."event_feedback_status" add constraint "event_feedback_status_event_id_fkey" FOREIGN KEY (event_id) REFERENCES calendar_events(id) not valid;

alter table "public"."event_feedback_status" validate constraint "event_feedback_status_event_id_fkey";

alter table "public"."food_items" add constraint "food_items_name_key" UNIQUE using index "food_items_name_key";

alter table "public"."languages" add constraint "languages_name_key" UNIQUE using index "languages_name_key";

alter table "public"."music_genres" add constraint "music_genres_name_key" UNIQUE using index "music_genres_name_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."profiles" add constraint "username_length" CHECK ((char_length(username) >= 3)) not valid;

alter table "public"."profiles" validate constraint "username_length";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_completed_events()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN
        SELECT ce.* 
        FROM calendar_events ce
        LEFT JOIN event_feedback_status efs ON ce.id = efs.event_id
        WHERE 
            ce.end_time BETWEEN NOW() - INTERVAL '15 minutes' AND NOW()
            AND (efs.feedback_sent IS NULL OR efs.feedback_sent = FALSE)
    LOOP
        PERFORM net.http_post(
            url:='https://ejqucnzpgebbujlnmdzx.functions.supabase.co/daily-checkin',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXVjbnpwZ2ViYnVqbG5tZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MDA3NjgsImV4cCI6MjA1MzA3Njc2OH0.wXBUTxCLlq4vtGnF8ScvGFzZQeJfdYhgzvW6CF3eViI"}'::jsonb,
            body:=json_build_object(
                'type', 'post-event',
                'event_id', event_record.id,
                'user_id', event_record.user_id,
                'event_title', event_record.title
            )::jsonb
        );
        
        INSERT INTO event_feedback_status (event_id, feedback_sent)
        VALUES (event_record.id, TRUE)
        ON CONFLICT (event_id) 
        DO UPDATE SET feedback_sent = TRUE;
    END LOOP;

    RETURN json_build_object('status', 'Post-event checks completed');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (
    id, 
    username, 
    avatar_url,
    onboarding_completed,
    onboarding_step,
    onboarding_started_at,
    has_completed_tutorial
  )
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    false,
    'initial',
    now(),
    false
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.schedule_evening_checkin()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  SELECT
    net.http_post(
      url:='https://ejqucnzpgebbujlnmdzx.functions.supabase.co/daily-checkin',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXVjbnpwZ2ViYnVqbG5tZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MDA3NjgsImV4cCI6MjA1MzA3Njc2OH0.wXBUTxCLlq4vtGnF8ScvGFzZQeJfdYhgzvW6CF3eViI"}'::jsonb,
      body:='{"type": "evening"}'::jsonb
    );
  RETURN json_build_object('status', 'Evening check-in scheduled');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.schedule_morning_checkin()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  SELECT
    net.http_post(
      url:='https://ejqucnzpgebbujlnmdzx.functions.supabase.co/daily-checkin',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXVjbnpwZ2ViYnVqbG5tZHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MDA3NjgsImV4cCI6MjA1MzA3Njc2OH0.wXBUTxCLlq4vtGnF8ScvGFzZQeJfdYhgzvW6CF3eViI"}'::jsonb,
      body:='{"type": "morning"}'::jsonb
    );
  RETURN json_build_object('status', 'Morning check-in scheduled');
END;
$function$
;

grant delete on table "public"."activities" to "anon";

grant insert on table "public"."activities" to "anon";

grant references on table "public"."activities" to "anon";

grant select on table "public"."activities" to "anon";

grant trigger on table "public"."activities" to "anon";

grant truncate on table "public"."activities" to "anon";

grant update on table "public"."activities" to "anon";

grant delete on table "public"."activities" to "authenticated";

grant insert on table "public"."activities" to "authenticated";

grant references on table "public"."activities" to "authenticated";

grant select on table "public"."activities" to "authenticated";

grant trigger on table "public"."activities" to "authenticated";

grant truncate on table "public"."activities" to "authenticated";

grant update on table "public"."activities" to "authenticated";

grant delete on table "public"."activities" to "service_role";

grant insert on table "public"."activities" to "service_role";

grant references on table "public"."activities" to "service_role";

grant select on table "public"."activities" to "service_role";

grant trigger on table "public"."activities" to "service_role";

grant truncate on table "public"."activities" to "service_role";

grant update on table "public"."activities" to "service_role";

grant delete on table "public"."calendar_events" to "anon";

grant insert on table "public"."calendar_events" to "anon";

grant references on table "public"."calendar_events" to "anon";

grant select on table "public"."calendar_events" to "anon";

grant trigger on table "public"."calendar_events" to "anon";

grant truncate on table "public"."calendar_events" to "anon";

grant update on table "public"."calendar_events" to "anon";

grant delete on table "public"."calendar_events" to "authenticated";

grant insert on table "public"."calendar_events" to "authenticated";

grant references on table "public"."calendar_events" to "authenticated";

grant select on table "public"."calendar_events" to "authenticated";

grant trigger on table "public"."calendar_events" to "authenticated";

grant truncate on table "public"."calendar_events" to "authenticated";

grant update on table "public"."calendar_events" to "authenticated";

grant delete on table "public"."calendar_events" to "service_role";

grant insert on table "public"."calendar_events" to "service_role";

grant references on table "public"."calendar_events" to "service_role";

grant select on table "public"."calendar_events" to "service_role";

grant trigger on table "public"."calendar_events" to "service_role";

grant truncate on table "public"."calendar_events" to "service_role";

grant update on table "public"."calendar_events" to "service_role";

grant delete on table "public"."chat_history" to "anon";

grant insert on table "public"."chat_history" to "anon";

grant references on table "public"."chat_history" to "anon";

grant select on table "public"."chat_history" to "anon";

grant trigger on table "public"."chat_history" to "anon";

grant truncate on table "public"."chat_history" to "anon";

grant update on table "public"."chat_history" to "anon";

grant delete on table "public"."chat_history" to "authenticated";

grant insert on table "public"."chat_history" to "authenticated";

grant references on table "public"."chat_history" to "authenticated";

grant select on table "public"."chat_history" to "authenticated";

grant trigger on table "public"."chat_history" to "authenticated";

grant truncate on table "public"."chat_history" to "authenticated";

grant update on table "public"."chat_history" to "authenticated";

grant delete on table "public"."chat_history" to "service_role";

grant insert on table "public"."chat_history" to "service_role";

grant references on table "public"."chat_history" to "service_role";

grant select on table "public"."chat_history" to "service_role";

grant trigger on table "public"."chat_history" to "service_role";

grant truncate on table "public"."chat_history" to "service_role";

grant update on table "public"."chat_history" to "service_role";

grant delete on table "public"."contact_group_memberships" to "anon";

grant insert on table "public"."contact_group_memberships" to "anon";

grant references on table "public"."contact_group_memberships" to "anon";

grant select on table "public"."contact_group_memberships" to "anon";

grant trigger on table "public"."contact_group_memberships" to "anon";

grant truncate on table "public"."contact_group_memberships" to "anon";

grant update on table "public"."contact_group_memberships" to "anon";

grant delete on table "public"."contact_group_memberships" to "authenticated";

grant insert on table "public"."contact_group_memberships" to "authenticated";

grant references on table "public"."contact_group_memberships" to "authenticated";

grant select on table "public"."contact_group_memberships" to "authenticated";

grant trigger on table "public"."contact_group_memberships" to "authenticated";

grant truncate on table "public"."contact_group_memberships" to "authenticated";

grant update on table "public"."contact_group_memberships" to "authenticated";

grant delete on table "public"."contact_group_memberships" to "service_role";

grant insert on table "public"."contact_group_memberships" to "service_role";

grant references on table "public"."contact_group_memberships" to "service_role";

grant select on table "public"."contact_group_memberships" to "service_role";

grant trigger on table "public"."contact_group_memberships" to "service_role";

grant truncate on table "public"."contact_group_memberships" to "service_role";

grant update on table "public"."contact_group_memberships" to "service_role";

grant delete on table "public"."contact_groups" to "anon";

grant insert on table "public"."contact_groups" to "anon";

grant references on table "public"."contact_groups" to "anon";

grant select on table "public"."contact_groups" to "anon";

grant trigger on table "public"."contact_groups" to "anon";

grant truncate on table "public"."contact_groups" to "anon";

grant update on table "public"."contact_groups" to "anon";

grant delete on table "public"."contact_groups" to "authenticated";

grant insert on table "public"."contact_groups" to "authenticated";

grant references on table "public"."contact_groups" to "authenticated";

grant select on table "public"."contact_groups" to "authenticated";

grant trigger on table "public"."contact_groups" to "authenticated";

grant truncate on table "public"."contact_groups" to "authenticated";

grant update on table "public"."contact_groups" to "authenticated";

grant delete on table "public"."contact_groups" to "service_role";

grant insert on table "public"."contact_groups" to "service_role";

grant references on table "public"."contact_groups" to "service_role";

grant select on table "public"."contact_groups" to "service_role";

grant trigger on table "public"."contact_groups" to "service_role";

grant truncate on table "public"."contact_groups" to "service_role";

grant update on table "public"."contact_groups" to "service_role";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

grant delete on table "public"."event_feedback_status" to "anon";

grant insert on table "public"."event_feedback_status" to "anon";

grant references on table "public"."event_feedback_status" to "anon";

grant select on table "public"."event_feedback_status" to "anon";

grant trigger on table "public"."event_feedback_status" to "anon";

grant truncate on table "public"."event_feedback_status" to "anon";

grant update on table "public"."event_feedback_status" to "anon";

grant delete on table "public"."event_feedback_status" to "authenticated";

grant insert on table "public"."event_feedback_status" to "authenticated";

grant references on table "public"."event_feedback_status" to "authenticated";

grant select on table "public"."event_feedback_status" to "authenticated";

grant trigger on table "public"."event_feedback_status" to "authenticated";

grant truncate on table "public"."event_feedback_status" to "authenticated";

grant update on table "public"."event_feedback_status" to "authenticated";

grant delete on table "public"."event_feedback_status" to "service_role";

grant insert on table "public"."event_feedback_status" to "service_role";

grant references on table "public"."event_feedback_status" to "service_role";

grant select on table "public"."event_feedback_status" to "service_role";

grant trigger on table "public"."event_feedback_status" to "service_role";

grant truncate on table "public"."event_feedback_status" to "service_role";

grant update on table "public"."event_feedback_status" to "service_role";

grant delete on table "public"."food_items" to "anon";

grant insert on table "public"."food_items" to "anon";

grant references on table "public"."food_items" to "anon";

grant select on table "public"."food_items" to "anon";

grant trigger on table "public"."food_items" to "anon";

grant truncate on table "public"."food_items" to "anon";

grant update on table "public"."food_items" to "anon";

grant delete on table "public"."food_items" to "authenticated";

grant insert on table "public"."food_items" to "authenticated";

grant references on table "public"."food_items" to "authenticated";

grant select on table "public"."food_items" to "authenticated";

grant trigger on table "public"."food_items" to "authenticated";

grant truncate on table "public"."food_items" to "authenticated";

grant update on table "public"."food_items" to "authenticated";

grant delete on table "public"."food_items" to "service_role";

grant insert on table "public"."food_items" to "service_role";

grant references on table "public"."food_items" to "service_role";

grant select on table "public"."food_items" to "service_role";

grant trigger on table "public"."food_items" to "service_role";

grant truncate on table "public"."food_items" to "service_role";

grant update on table "public"."food_items" to "service_role";

grant delete on table "public"."languages" to "anon";

grant insert on table "public"."languages" to "anon";

grant references on table "public"."languages" to "anon";

grant select on table "public"."languages" to "anon";

grant trigger on table "public"."languages" to "anon";

grant truncate on table "public"."languages" to "anon";

grant update on table "public"."languages" to "anon";

grant delete on table "public"."languages" to "authenticated";

grant insert on table "public"."languages" to "authenticated";

grant references on table "public"."languages" to "authenticated";

grant select on table "public"."languages" to "authenticated";

grant trigger on table "public"."languages" to "authenticated";

grant truncate on table "public"."languages" to "authenticated";

grant update on table "public"."languages" to "authenticated";

grant delete on table "public"."languages" to "service_role";

grant insert on table "public"."languages" to "service_role";

grant references on table "public"."languages" to "service_role";

grant select on table "public"."languages" to "service_role";

grant trigger on table "public"."languages" to "service_role";

grant truncate on table "public"."languages" to "service_role";

grant update on table "public"."languages" to "service_role";

grant delete on table "public"."music_genres" to "anon";

grant insert on table "public"."music_genres" to "anon";

grant references on table "public"."music_genres" to "anon";

grant select on table "public"."music_genres" to "anon";

grant trigger on table "public"."music_genres" to "anon";

grant truncate on table "public"."music_genres" to "anon";

grant update on table "public"."music_genres" to "anon";

grant delete on table "public"."music_genres" to "authenticated";

grant insert on table "public"."music_genres" to "authenticated";

grant references on table "public"."music_genres" to "authenticated";

grant select on table "public"."music_genres" to "authenticated";

grant trigger on table "public"."music_genres" to "authenticated";

grant truncate on table "public"."music_genres" to "authenticated";

grant update on table "public"."music_genres" to "authenticated";

grant delete on table "public"."music_genres" to "service_role";

grant insert on table "public"."music_genres" to "service_role";

grant references on table "public"."music_genres" to "service_role";

grant select on table "public"."music_genres" to "service_role";

grant trigger on table "public"."music_genres" to "service_role";

grant truncate on table "public"."music_genres" to "service_role";

grant update on table "public"."music_genres" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

create policy "Activities are viewable by everyone"
on "public"."activities"
as permissive
for select
to authenticated
using (true);


create policy "Enable insert for admin"
on "public"."activities"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can delete their own calendar events"
on "public"."calendar_events"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own calendar events"
on "public"."calendar_events"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can read their own calendar events"
on "public"."calendar_events"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own calendar events"
on "public"."calendar_events"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own messages"
on "public"."chat_history"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can read their own messages"
on "public"."chat_history"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can manage their own contact group memberships"
on "public"."contact_group_memberships"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM contacts c
  WHERE ((c.id = contact_group_memberships.contact_id) AND (c.user_id = auth.uid())))));


create policy "Users can create their own groups"
on "public"."contact_groups"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can delete their own groups"
on "public"."contact_groups"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can view their own groups"
on "public"."contact_groups"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can delete their own contacts"
on "public"."contacts"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own contacts"
on "public"."contacts"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can read their own contacts"
on "public"."contacts"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update their own contacts"
on "public"."contacts"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can manage their own event feedback status"
on "public"."event_feedback_status"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM calendar_events
  WHERE ((calendar_events.id = event_feedback_status.event_id) AND (calendar_events.user_id = auth.uid())))));


create policy "Enable insert for authenticated users"
on "public"."food_items"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Food items are viewable by everyone"
on "public"."food_items"
as permissive
for select
to public
using (true);


create policy "Languages are viewable by everyone"
on "public"."languages"
as permissive
for select
to authenticated
using (true);


create policy "Enable insert for authenticated users"
on "public"."music_genres"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Music genres are viewable by everyone"
on "public"."music_genres"
as permissive
for select
to public
using (true);


create policy "Public profiles are viewable by everyone."
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can manage their own goals"
on "public"."profiles"
as permissive
for all
to public
using ((auth.uid() = id));


create policy "Users can read their own onboarding status"
on "public"."profiles"
as permissive
for select
to authenticated
using ((auth.uid() = id));


create policy "Users can read their own tokens"
on "public"."profiles"
as permissive
for select
to authenticated
using ((auth.uid() = id));


create policy "Users can update own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can update their own tokens"
on "public"."profiles"
as permissive
for update
to authenticated
using ((auth.uid() = id));


create policy "Users can update their personality data"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



