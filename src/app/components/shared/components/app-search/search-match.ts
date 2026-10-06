/** Match display text without changing the original collection or selection. */
export function matchesSearch(term: string, ...values: Array<string | null | undefined>): boolean {
  const query = term.trim().toLocaleLowerCase();
  return !query || values.some((value) => value?.toLocaleLowerCase().includes(query));
}
