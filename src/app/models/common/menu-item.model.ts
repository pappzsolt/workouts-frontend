import type { AppIconName } from '../../components/shared/components/app-icon/app-icon.component';

/** MenuItem frontend model. */
export interface MenuItem {
  label: string;
  path?: string;
  /** Lucide ikon a menüpont előtt (app-icon név). */
  icon?: AppIconName;
  children?: MenuItem[];
  open?: boolean;
  action?: string;
}
