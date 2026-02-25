

# Plan: Email Waiting List for Landing Page

## Overview

The email input in the Hero section currently does nothing meaningful — it just opens the invite modal. The goal is to make it collect emails into a `waiting_list` database table, providing users with feedback (success/duplicate/error), and serve as the foundation for future invite code distribution.

## Database Changes

Create a new `waiting_list` table:

```sql
CREATE TABLE public.waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'hero_cta',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'registered')),
  created_at TIMESTAMPTZ DEFAULT now(),
  invited_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- RLS: allow anonymous inserts (public landing page, no auth required)
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waiting list"
  ON public.waiting_list FOR INSERT
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for anon — admin only via service role
```

Key design decisions:
- `UNIQUE` constraint on `email` prevents duplicates
- No auth required for INSERT (public-facing landing page)
- No SELECT policy for anon users — only admins can view the list
- `status` column tracks lifecycle: pending → invited → registered
- `source` column tracks where the signup came from (hero CTA, bottom CTA, etc.)

## File Changes

### 1. `src/components/landing/HeroSection.tsx`

- Add `useState` for the email input value, loading state, and submitted state
- On form submit: insert email into `waiting_list` via Supabase client
- Handle duplicate emails gracefully (show "already on the list" message)
- Show success feedback inline (replace the form briefly or show a toast)
- Remove the `onBookDemo` call from the form submit — the form now has its own purpose
- Keep the `onBookDemo` prop for the button, but change flow: submit email first, then optionally open invite modal

The form will:
1. Validate email format client-side
2. Insert into `waiting_list` table
3. On success: show "已加入等候名单" confirmation with a checkmark
4. On duplicate (unique constraint error): show "该邮箱已在等候名单中"
5. On error: show generic error toast

### 2. `src/pages/Landing.tsx`

- Pass email submission handler or update `HeroSection` props if needed (minimal change — most logic stays in `HeroSection`)

### 3. Bottom CTA section in `Landing.tsx`

- Convert the bottom CTA email-like button into a similar email collection form with `source: 'bottom_cta'`, reusing the same pattern

## Technical Details

- Uses `supabase.from('waiting_list').insert({ email })` directly from the client
- The unique constraint violation returns a Postgres error code `23505` which we catch to show "already registered"
- No authentication required — RLS policy allows anonymous inserts
- Email validation uses a simple HTML5 `type="email"` + basic regex check before submission

