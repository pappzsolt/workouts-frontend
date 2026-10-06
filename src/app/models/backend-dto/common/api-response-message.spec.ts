import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage, responseMessage } from './api-response-message';

describe('Backend response messages', () => {
  it('preserves distinct backend messages from batch operations', () => {
    expect(responseMessage([{ message: 'Saved A' }, { message: 'Saved B' }, { message: 'Saved A' }], 'fallback'))
      .toBe('Saved A\nSaved B');
  });
  it('uses the translation fallback only when backend text is absent', () => {
    expect(responseMessage([{ message: null }, { message: ' ' }], 'fallback')).toBe('fallback');
  });
  it('preserves JSON and plain-text HTTP error responses', () => {
    expect(errorMessage(new HttpErrorResponse({ error: { message: 'Denied' }, status: 403 }), 'fallback')).toBe('Denied');
    expect(errorMessage(new HttpErrorResponse({ error: 'Conflict', status: 409 }), 'fallback')).toBe('Conflict');
    expect(errorMessage(new HttpErrorResponse({ error: {}, status: 500 }), 'fallback')).toBe('fallback');
  });
});
