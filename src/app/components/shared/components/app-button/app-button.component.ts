import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

export type AppButtonVariant =
  'primary' | 'save' | 'edit' | 'search' | 'sort' | 'add' | 'delete' | 'secondary' | 'danger';

export type AppButtonAppearance =
  'solid' | 'outline' | 'ghost' | 'link' | 'custom' | 'selection-row';

export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonType = 'button' | 'submit' | 'reset';

export type AppButtonLucideIcon = AppIconName | '';

@Component({
  selector: 'app-button',
  host: {
    '[style.display]':
      "appearance === 'custom' || appearance === 'selection-row' ? 'contents' : null",
  },
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.css',
})
export class AppButtonComponent {
  // Gomb megjelenése
  @Input() variant: AppButtonVariant = 'primary';
  @Input() size: AppButtonSize = 'md';
  @Input() type: AppButtonType = 'button';

  @Input() appearance: AppButtonAppearance = 'solid';
  @Input({ transform: booleanAttribute }) fullWidth = false;
  @Input({ transform: booleanAttribute }) iconOnly = false;
  @Input({ transform: booleanAttribute }) round = false;
  @Input({ transform: booleanAttribute }) active = false;
  @Input({ transform: booleanAttribute }) completed = false;
  @Input() align: 'center' | 'start' = 'center';
  @Input() buttonClass = '';
  @Input() testId = '';
  @Input() buttonRole: string | null = null;
  @Input() ariaSelected: boolean | null = null;
  @Input() tabIndex: number | null = null;
  @Input() ariaPressed: boolean | null = null;
  @Input() ariaCurrent: 'page' | 'step' | null = null;

  // Gomb felirata
  @Input() label = '';

  // Opcionális Lucide ikon
  @Input() lucideIcon: AppButtonLucideIcon = '';

  // Tooltip
  @Input() title = '';
  @Input() ariaLabel = '';
  @Input() ariaExpanded: boolean | null = null;
  @Input() ariaControls = '';

  // Állapot
  @Input({ transform: booleanAttribute }) disabled = false;

  // Lebegő, kör alakú gomb
  @Input({ transform: booleanAttribute }) floating = false;

  // Kattintási esemény
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  /**
   * Kattintási esemény továbbítása
   */
  onClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.buttonClick.emit(event);
  }

  getAppearanceClasses(): string {
    if (this.appearance === 'custom' || this.appearance === 'selection-row') return '';
    if (this.active)
      return 'border border-primary-700 bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-300';
    if (this.completed)
      return 'border border-save-200 bg-save-50 text-save-700 hover:bg-save-100 focus:ring-save-300';
    const destructive = this.variant === 'delete' || this.variant === 'danger';
    switch (this.appearance) {
      case 'outline':
        return destructive
          ? 'border border-delete-200 bg-white text-delete-700 hover:bg-delete-50 focus:ring-delete-300'
          : 'border border-surface-300 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-50 focus:ring-primary-300';
      case 'ghost':
        return destructive
          ? 'border border-transparent bg-transparent text-delete-700 hover:bg-delete-50 focus:ring-delete-300'
          : 'border border-transparent bg-transparent text-content-700 hover:bg-surface-100 focus:ring-primary-300';
      case 'link':
        return 'border border-transparent bg-transparent text-primary-700 hover:underline focus:ring-primary-300';
      default:
        return this.getVariantClasses();
    }
  }

  /**
   * Normál gomb színosztályai
   */
  getVariantClasses(): string {
    const variants: Record<AppButtonVariant, string> = {
      primary: 'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-300',

      save: 'bg-save-700 text-white hover:bg-save-800 focus:ring-save-300',

      edit: 'bg-edit-600 text-white hover:bg-edit-700 focus:ring-edit-300',

      search: 'bg-search-700 text-white hover:bg-search-800 focus:ring-search-200',

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
      primary: 'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-300',
      save: 'bg-save-700 text-white hover:bg-save-800 focus:ring-save-300',
      edit: 'bg-edit-600 text-white hover:bg-edit-700 focus:ring-edit-300',
      search: 'bg-search-700 text-white hover:bg-search-800 focus:ring-search-200',
      sort: 'bg-sort-600 text-white hover:bg-sort-700 focus:ring-sort-300',
      add: 'bg-add-600 text-content-900 hover:bg-add-700 hover:text-white focus:ring-add-200',
      delete: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',
      secondary: 'bg-surface-400 text-content-900 hover:bg-surface-300 focus:ring-surface-300',
      danger: 'bg-delete-600 text-white hover:bg-delete-700 focus:ring-delete-300',
    };

    return variants[this.variant];
  }
}
