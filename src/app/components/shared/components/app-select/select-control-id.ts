import { DestroyRef, inject } from '@angular/core';
const activeIds = new Set<string>();
export function reserveSelectControlId(base: string): string {
  let id = base;
  let suffix = 2;
  while (activeIds.has(id)) id = `${base}-${suffix++}`;
  activeIds.add(id);
  inject(DestroyRef).onDestroy(() => activeIds.delete(id));
  return id;
}
