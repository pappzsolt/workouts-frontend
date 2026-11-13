/** Browser storage can throw (e.g. privacy restrictions or disabled cookies). */
export function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The current in-memory app session must still be usable.
  }
}

export function safeStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Do not prevent login/logout if persistent storage is blocked.
  }
}
