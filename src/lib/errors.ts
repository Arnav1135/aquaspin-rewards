import toast from 'react-hot-toast';

export function handleError(error: unknown, message?: string) {
  const errorMessage = error instanceof Error ? error.message : message || 'An error occurred';
  toast.error(errorMessage);
  console.error('Error:', error, message);
}

export function handleSuccess(message: string) {
  toast.success(message);
}

export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}
