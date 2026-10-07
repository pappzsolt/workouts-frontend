/** Primitive values supported by the shared select. */
export type SelectValue = string | number | boolean | null | undefined;

/** Defaults to strings for existing consumers. */
export interface SelectOption<T extends SelectValue = string> {
  value: T;
  label: string;
  searchText?: string;
}
