-- Migration: Enhance Events Schema with Category, Speakers, Duration, Deadline, Visibility, and Attendance
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
