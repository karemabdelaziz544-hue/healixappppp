-- Fix doctor and admin access to chat attachments bucket

-- 1. Drop the existing SELECT/ALL policy for chat attachments
DROP POLICY IF EXISTS "Users and doctors can access storage chat attachments" ON storage.objects;

-- 2. Re-create the policy to explicitly grant admins and doctors read/write access to all chat attachments
CREATE POLICY "Users and doctors can access storage chat attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'chat-attachments' AND
    auth.role() = 'authenticated' AND (
      -- 1. Owner of the folder can access it (name path starts with their user ID)
      name LIKE auth.uid()::text || '/%' 
      
      -- 2. Admins and Doctors can access all attachments to reply to inquiries
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role IN ('admin', 'doctor')
      ) 
      
      -- 3. Assigned doctors or family managers can access it
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '/', 1) AND (
          manager_id = auth.uid() 
          OR assigned_doctor_id = auth.uid()
        )
      )
    )
  );
