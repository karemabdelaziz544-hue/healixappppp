-- Migration: Add Category Column to Articles Table
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS category TEXT;
