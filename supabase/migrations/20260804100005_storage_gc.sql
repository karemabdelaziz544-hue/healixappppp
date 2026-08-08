-- =====================================================================
-- Migration: 20260804100005_storage_gc.sql
-- Description: Multi-Table Safe Storage Garbage Collection
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.storage_gc_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL,
  object_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('detected_orphan', 'cleaned', 'skipped_referenced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.storage_gc_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_gc_admin_read" ON public.storage_gc_log;
CREATE POLICY "storage_gc_admin_read" ON public.storage_gc_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Function verifying file reference across ALL database tables before unlinking
CREATE OR REPLACE FUNCTION public.is_file_referenced_in_db(file_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. Check client_documents
  IF EXISTS (SELECT 1 FROM public.client_documents WHERE file_url LIKE '%' || file_path || '%') THEN RETURN true; END IF;
  
  -- 2. Check inbody_records
  IF EXISTS (SELECT 1 FROM public.inbody_records WHERE image_url LIKE '%' || file_path || '%') THEN RETURN true; END IF;

  -- 3. Check profiles (avatar_url)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE avatar_url LIKE '%' || file_path || '%') THEN RETURN true; END IF;

  -- 4. Check messages (attachment_url)
  IF EXISTS (SELECT 1 FROM public.messages WHERE attachment_url LIKE '%' || file_path || '%') THEN RETURN true; END IF;

  -- 5. Check payment_requests (receipt_url)
  IF EXISTS (SELECT 1 FROM public.payment_requests WHERE receipt_url LIKE '%' || file_path || '%') THEN RETURN true; END IF;

  -- 6. Check event_bookings (payment_proof)
  IF EXISTS (SELECT 1 FROM public.event_bookings WHERE payment_proof LIKE '%' || file_path || '%') THEN RETURN true; END IF;

  RETURN false;
END;
$$;
