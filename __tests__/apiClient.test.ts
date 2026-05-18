import { executeQuery } from '../src/lib/apiClient';

describe('apiClient executeQuery', () => {
  it('should return data on successful query', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    };

    const { data, error } = await executeQuery(mockQuery);
    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
  });

  it('should throw and retry on failure if retries are configured', async () => {
    const mockQuery = {
      abortSignal: jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true }, error: null })
    };

    // Fast backoff for testing
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });

    const { data, error } = await executeQuery(mockQuery, { retries: 1 });
    
    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
    expect(mockQuery.abortSignal).toHaveBeenCalledTimes(2);

    jest.restoreAllMocks();
  });
});
