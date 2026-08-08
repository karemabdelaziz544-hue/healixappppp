import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy_key';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_key';

// This test suite runs against the REAL local Supabase instance
describe('Edge Functions Integration', () => {
  let supabase: any;
  let adminClient: any;
  
  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
    adminClient = createClient(supabaseUrl, serviceRoleKey);
  });

  describe('healix-ai', () => {
    it('should return 401 Unauthorized for unauthenticated requests', async () => {
      const { data, error } = await supabase.functions.invoke('healix-ai', {
        body: { query: 'test', profileId: '123' },
      });
      // Depending on the Supabase client version, it might throw an error or return in error obj
      expect(error).toBeDefined();
      expect(error.message).toMatch(/unauthorized|non-2xx status code/i);
    });
  });

  describe('upload-visitor-attachment', () => {
    it('should reject invalid visitor token', async () => {
      const { data, error } = await supabase.functions.invoke('upload-visitor-attachment', {
        body: { conversationId: 'invalid-conv', visitorToken: 'invalid-token', filename: 'test.jpg' },
      });
      expect(error).toBeDefined();
    });
  });

  describe('delete-account', () => {
    it('should reject unauthorized request without service key', async () => {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { targetUserId: 'some-user-id' },
      });
      expect(error).toBeDefined();
    });
  });
});
