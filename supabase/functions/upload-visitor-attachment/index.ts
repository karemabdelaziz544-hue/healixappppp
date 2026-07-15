// @ts-nocheck
// upload-visitor-attachment — Supabase Edge Function
// Validates visitor token, conversation ownership, file constraints, and uploads visitor attachments securely.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed file extension patterns and mime-types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  // Audio
  'audio/webm', 'audio/m4a', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mpeg',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversation_id') as string | null;
    const visitorToken = formData.get('visitor_token') as string | null;

    if (!file || !conversationId || !visitorToken) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: file, conversation_id, or visitor_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate Conversation Ownership
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, status, visitor_token')
      .eq('id', conversationId)
      .eq('visitor_token', visitorToken)
      .maybeSingle();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid conversation or visitor token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (conversation.status === 'closed') {
      return new Response(JSON.stringify({ error: 'Forbidden: Conversation is closed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Rate Limiting Check: max 10 attachments per minute in this conversation
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .not('attachment_url', 'is', null)
      .gt('created_at', oneMinuteAgo);

    if (countError) throw countError;

    if (count && count >= 10) {
      return new Response(JSON.stringify({ error: 'Too many file uploads. Please wait a minute and try again.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds the 10MB limit.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: `File type not supported: ${file.type || 'unknown'}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Upload File using Service Role Key
    const fileExt = file.name.split('.').pop() || '';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const storagePath = `visitors/${conversationId}/${cleanFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chat-attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(JSON.stringify({ 
      message: 'Upload successful',
      filePath: storagePath
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[upload-visitor-attachment] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error uploading file' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
