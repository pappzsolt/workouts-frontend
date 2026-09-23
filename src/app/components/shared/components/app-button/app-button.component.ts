import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  LucideArrowDownWideNarrow,
  LucideArrowUpNarrowWide,
  LucidePencil,
} from '@lucide/angular';

export type AppButtonVariant =
  'primary' | 'save' | 'edit' | 'search' | 'sort' | 'add' | 'delete' | 'secondary' | 'danger';

export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonType = 'button' | 'submit' | 'reset';

export type AppButtonLucideIcon =
  | 'arrow-up-narrow-wide'
  | 'arrow-down-wide-narrow'
  | 'pencil'
  | '';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LucideArrowUpNarrowWide, LucideArrowDownWideNarrow, LucidePencil],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.css',
})
export class AppButtonComponent {
  // Gomb megjelenése
  @Input() variant: AppButtonVariant = 'primary';
  @Input() size: AppButtonSize = 'md';
  @Input() type: AppButtonType = 'button';

  // Gomb felirata
  @Input() label = '';

  // Opcionális emoji vagy szöveges ikon
  @Input() icon = '';

  // Opcionális Lucide ikon
  @Input() lucideIcon: AppButtonLucideIcon = '';

  // Tooltip
  @Input() title = '';

  // Állapot
  @Input() disabled = false;

  // Lebegő, kör alakú gomb
  @Input() floating = false;

  // Kattintási esemény
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  /**
   * Kattintási esemény továbbítása
   */
  onClick(event: MouseEvent): void {
    if (this.disabled) {
      return;
    }

    this.buttonClick.emit(event);
  }

  /**
   * Normál gomb színosztályai
   */
  getVariantClasses(): string {
    const variants: Record<AppButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-300',

      save: 'bg-save-600 text-white hover:bg-save-700 focus:ring-save-300',

      edit: 'bg-edit-600 text-white hover:bg-edit-700 focus:ring-edit-300',

      search: 'bg-search-600 text-white hover:bg-search-700 focus:ring-search-200',

      sort: 'bg-sort-600 text-white hover:bg-sort-700 focus:ring-sort-300',

      add: 'bg-add-600 text-content-900 hover:bg-add-700 hover:text-white focus:ring-add-200',

      delete: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',

      secondary: 'bg-surface-200 text-content-800 hover:bg-surface-300 focus:ring-surface-300',

      danger: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',
    };

    return variants[this.variant];
  }

  /**
   * Lebegő gomb színosztályai
   */
  getFloatingClasses(): string {
    const variants: Record<AppButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-300',
      save: 'bg-save-600 text-white hover:bg-save-700 focus:ring-save-300',
      edit: 'bg-edit-600 text-white hover:bg-edit-700 focus:ring-edit-300',
      search: 'bg-search-600 text-white hover:bg-search-700 focus:ring-search-200',
      sort: 'bg-sort-600 text-white hover:bg-sort-700 focus:ring-sort-300',
      add: 'bg-add-600 text-content-900 hover:bg-add-700 hover:text-white focus:ring-add-200',
      delete: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',
      secondary: 'bg-surface-400 text-content-900 hover:bg-surface-300 focus:ring-surface-300',
      danger: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',
    };

    return variants[this.variant];
  }
}
