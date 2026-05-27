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

export type ApiErrorAction = 'retry' | 'support';

export interface MappedApiError {
  message: string;
  error?: string;
  action: ApiErrorAction;
  status?: number;
}

/** Maps network / HTTP failures to Spanish copy with a suggested user action. */
export function mapApiError(err: unknown): MappedApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const { message, error } = extractApiErrorPayload(err);

    if (!err.response) {
      return {
        message: 'Sin conexión al servidor. Revisa tu internet e inténtalo de nuevo.',
        error,
        action: 'retry',
      };
    }

    switch (status) {
      case 401:
        return {
          message: 'Tu sesión expiró o no tienes acceso. Vuelve a iniciar sesión o contacta soporte.',
          error,
          action: 'support',
          status,
        };
      case 409:
        return {
          message:
            message === 'Something went wrong. Please try again.'
              ? 'Esta operación ya no está disponible o fue modificada. Contacta soporte si necesitas ayuda.'
              : message,
          error,
          action: 'support',
          status,
        };
      case 500:
      case 502:
      case 503:
        return {
          message: 'El servidor no respondió correctamente. Inténtalo de nuevo en unos momentos.',
          error,
          action: 'retry',
          status,
        };
      default:
        return {
          message:
            message === 'Something went wrong. Please try again.'
              ? 'Ocurrió un error inesperado. Inténtalo de nuevo.'
              : message,
          error,
          action: status !== undefined && status >= 400 && status < 500 ? 'support' : 'retry',
          status,
        };
    }
  }

  if (err instanceof Error) {
    return { message: err.message, action: 'retry' };
  }

  return {
    message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    action: 'retry',
  };
}
