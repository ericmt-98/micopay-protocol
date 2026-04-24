import axios from 'axios';

/**
 * Normalizes Fastify `setErrorHandler` payloads (`{ error, message }`) and Axios failures
 * so UI can show a safe string + optional machine-readable `error` key (#20 error path).
 */
export function extractApiErrorPayload(err: unknown): { message: string; error?: string } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    const message =
      typeof data?.message === 'string' && data.message.length > 0
        ? data.message
        : err.message || 'Something went wrong. Please try again.';
    const error = typeof data?.error === 'string' ? data.error : undefined;
    return { message, error };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: 'Something went wrong. Please try again.' };
}
