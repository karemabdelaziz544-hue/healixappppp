import { OfflineQueue } from '../src/lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('OfflineQueue — Security & Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents cross-profile mutation execution when session user does not match or manage mutation userId', async () => {
    const mockSession = { user: { id: 'user_111' } };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: mockSession } });

    // Return profiles owned by user_111
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockResolvedValue({
            data: [{ id: 'user_111' }, { id: 'sub_child_1' }],
            error: null,
          }),
        };
      }
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    const fakeQueue = [
      {
        id: 'mut_1',
        type: 'task_toggle',
        userId: 'user_111', // Authorized own
        payload: { taskId: '11111111-1111-1111-1111-111111111111', isCompleted: true, logDate: '2026-08-08' },
        timestamp: Date.now(),
      },
      {
        id: 'mut_2',
        type: 'task_toggle',
        userId: 'sub_child_1', // Authorized managed sub-profile
        payload: { taskId: '22222222-2222-2222-2222-222222222222', isCompleted: true, logDate: '2026-08-08' },
        timestamp: Date.now(),
      },
      {
        id: 'mut_3',
        type: 'task_toggle',
        userId: 'unauthorized_user_999', // UNAUTHORIZED CROSS-PROFILE MUTATION!
        payload: { taskId: '33333333-3333-3333-3333-333333333333', isCompleted: true, logDate: '2026-08-08' },
        timestamp: Date.now(),
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(fakeQueue));

    await OfflineQueue.sync();

    // Verify AsyncStorage saved empty remaining queue (unauthorized item dropped, valid items processed)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('healix_offline_queue', JSON.stringify([]));
  });
});
