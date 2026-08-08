import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Requires service role to execute claim_notification_jobs
const BATCH_SIZE = 50;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Claim Jobs Concurrently via PostgreSQL FOR UPDATE SKIP LOCKED
    // This calls the RPC we created in 20260808400000_performance_remediation.sql
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_notification_jobs', { p_batch_size: BATCH_SIZE });

    if (claimError) {
      console.error('Error claiming jobs:', claimError);
      return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs found' }), { status: 200 });
    }

    console.log(`Processing ${jobs.length} notification jobs...`);

    const results = {
      delivered: 0,
      failed: 0,
      dead_letter: 0
    };

    // 2. Process each job
    // Idempotency: We only process jobs we successfully claimed (status = 'sending' from the RPC).
    for (const job of jobs) {
      try {
        // --- MOCK NOTIFICATION DELIVERY (Provider abstraction) ---
        // In a real scenario, this would call Expo Push API or FCM.
        // We simulate a network call that occasionally fails.
        const deliverySuccess = await mockPushProviderSend(job);
        
        if (!deliverySuccess) {
          throw new Error('Push provider rejected the payload');
        }

        // 3a. Success
        await supabase
          .from('notification_queue')
          .update({
            status: 'delivered',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        results.delivered++;
      } catch (err) {
        // 3b. Failure & Exponential Backoff Retry
        const newRetryCount = job.retry_count + 1;
        const maxRetries = job.max_retries;
        
        if (newRetryCount >= maxRetries) {
          // Dead letter
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              retry_count: newRetryCount,
              last_error: err instanceof Error ? err.message : String(err),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
            
          results.dead_letter++;
        } else {
          // Calculate next retry using exponential backoff (e.g., 1 min, 2 min, 4 min...)
          const backoffMinutes = Math.pow(2, newRetryCount);
          const nextRetry = new Date(Date.now() + backoffMinutes * 60000);
          
          await supabase
            .from('notification_queue')
            .update({
              status: 'pending', // Re-queue
              retry_count: newRetryCount,
              next_retry_at: nextRetry.toISOString(),
              last_error: err instanceof Error ? err.message : String(err),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
            
          results.failed++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Batch processed',
      results 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Worker execution error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
});

// Mock Provider Function
async function mockPushProviderSend(job: any): Promise<boolean> {
  return new Promise((resolve) => {
    // Simulate latency
    setTimeout(() => {
      // 95% success rate for integration tests
      const success = Math.random() < 0.95;
      resolve(success);
    }, 100);
  });
}
