import { HttpErrorResponse } from '@angular/common/http';

/** Preserve backend text; translation keys are used only when no message was returned. */
export function responseMessage(responses: ReadonlyArray<{ message: string | null }>, fallback: string): string {
  const messages = responses.map(response => response.message).filter((message): message is string =>
    typeof message === 'string' && message.trim().length > 0);
  return [...new Set(messages)].join('\n') || fallback;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    const message = typeof body === 'string' ? body : body?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
