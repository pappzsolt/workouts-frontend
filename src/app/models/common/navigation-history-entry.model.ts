/** NavigationHistoryEntry frontend model. */
export interface NavigationHistoryEntry {
  url: string;
  state: Record<string, unknown>;

}
