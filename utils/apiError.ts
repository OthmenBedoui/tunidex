import { ApiError } from '../services/api';

type ErrorNotifier = (message: string, type?: 'success' | 'error') => void;

interface HandleApiErrorOptions {
  error: unknown;
  fallbackMessage: string;
  notify?: ErrorNotifier;
  rollback?: () => void;
  logContext?: string;
}

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export const handleApiError = ({
  error,
  fallbackMessage,
  notify,
  rollback,
  logContext = 'Frontend action failed'
}: HandleApiErrorOptions) => {
  rollback?.();
  const message = getApiErrorMessage(error, fallbackMessage);
  console.error(logContext, error);
  notify?.(message, 'error');
  return message;
};
