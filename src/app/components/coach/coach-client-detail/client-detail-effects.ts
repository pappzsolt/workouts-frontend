import type { DestroyRef } from '@angular/core';
import type { Observable } from 'rxjs';

/** Notification and request lifetime shared by the current client screen. */
export interface ClientDetailEffects {
  readonly cancelled$: Observable<void>;
  readonly destroyRef: DestroyRef;
  showMessage(key: string, type: 'success' | 'error' | 'info', params?: Record<string, unknown>): void;
  showError(error: unknown, fallbackKey: string): void;
}
