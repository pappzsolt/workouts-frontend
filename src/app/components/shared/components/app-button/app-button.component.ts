import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

export type AppButtonVariant =
  'primary' | 'save' | 'edit' | 'search' | 'sort' | 'add' | 'delete' | 'secondary' | 'danger' | 'inverse';

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
    if (this.active) return 'btn-primary';
    if (this.completed) return 'btn-tonal';
    const destructive = this.variant === 'delete' || this.variant === 'danger';
    switch (this.appearance) {
      case 'outline':
        return destructive ? 'btn-delete' : 'btn-outline';
      case 'ghost':
        return destructive ? 'btn-ghost-delete' : 'btn-ghost';
      case 'link':
        return 'btn-link';
      default:
        return this.getVariantClasses();
    }
  }

  /**
   * Normál gomb színosztályai
   */
  getVariantClasses(): string {
    return VARIANT_CLASSES[this.variant];
  }

  /**
   * Lebegő gomb színosztályai
   */
  getFloatingClasses(): string {
    return VARIANT_CLASSES[this.variant];
  }
}

/**
 * Egységes gombhierarchia; a stílusok a src/styles.css .btn-* osztályaiban vannak.
 * - fő művelet (primary, save, add, search): btn-primary
 * - szerkesztés (edit): btn-tonal
 * - másodlagos (secondary, sort): btn-neutral
 * - törlés (delete): btn-delete
 * - végleges, megerősített törlés (danger): btn-danger
 * - gomb a márkaszínű fejlécen (inverse): btn-inverse
 */
const VARIANT_CLASSES: Record<AppButtonVariant, string> = {
  primary: 'btn-primary',
  save: 'btn-primary',
  add: 'btn-primary',
  search: 'btn-primary',
  edit: 'btn-tonal',
  secondary: 'btn-neutral',
  sort: 'btn-neutral',
  delete: 'btn-delete',
  danger: 'btn-danger',
  inverse: 'btn-inverse',
};
