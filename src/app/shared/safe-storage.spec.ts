import { safeStorageGet, safeStorageRemove, safeStorageSet } from './safe-storage';

describe('Browser storage fallback', () => {
  it('keeps the application usable when storage access throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError');
    spyOn(Storage.prototype, 'setItem').and.throwError('SecurityError');
    spyOn(Storage.prototype, 'removeItem').and.throwError('SecurityError');
    expect(safeStorageGet('language')).toBeNull();
    expect(() => safeStorageSet('language', 'hu')).not.toThrow();
    expect(() => safeStorageRemove('accessToken')).not.toThrow();
  });
});
