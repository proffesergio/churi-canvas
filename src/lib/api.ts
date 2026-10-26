export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method || 'GET';
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch('/api/' + path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new ApiError(
          response.status,
          data.error || 'Something went wrong. Please try again.',
        );
      return data as T;
    } catch (error) {
      const retryable = !(error instanceof ApiError) || error.status >= 500;
      if (method !== 'GET' || !retryable || attempt >= 2) {
        if (error instanceof ApiError) throw error;
        throw new Error(
          'Connection interrupted. Check your internet and try again.',
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
    }
  }
}
