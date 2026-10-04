/** MenuItem frontend model. */
export interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
  open?: boolean;
  action?: string;

}
