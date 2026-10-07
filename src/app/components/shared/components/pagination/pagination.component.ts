import { AppSelectComponent } from '../app-select/app-select.component';
import type { SelectOption } from '../../../../models/common/select-option.model';
import { AppButtonComponent } from '../app-button/app-button.component';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

let nextPaginationId = 0;

@Component({
  standalone: true,
  selector: 'app-pagination',
  imports: [AppSelectComponent, AppButtonComponent, CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly pageSizeId = `pagination-page-size-${++nextPaginationId}`;
  // ============================================================
  // INPUTS – PARAMÉTEREZHETŐ BEÁLLÍTÁSOK
  // ============================================================

  /** Összes megjelenítendő rekord */
  @Input() totalItems = 0;

  /** Backendből érkező oldalszám (opcionális felülírás) */
  @Input() totalPagesOverride: number | null = null;

  /** Rekordok száma oldalanként */
  @Input() pageSize = 6;

  /** Aktuális oldal (1-től indexelve) */
  @Input() currentPage = 1;

  /** Választható oldalméretek */
  @Input() pageSizeOptions: number[] = [6, 12, 24, 48];

  /** Oldalméret-választó megjelenítése */
  @Input() showPageSize = true;

  /** Rekordinformáció megjelenítése */
  @Input() showInfo = true;
  @Input() showPageNumbers = false;
  @Input() pageLabel = 'pagination.page';
  @Input() maxPageNumbers = 7;

  get sizeOptions(): SelectOption<number>[] {
    return [...new Set([this.pageSize, ...this.pageSizeOptions])]
      .filter((size) => Number.isInteger(size) && size > 0)
      .map((size) => ({ value: size, label: String(size) }));
  }

  // ============================================================
  // OUTPUTS – ESEMÉNYEK A SZÜLŐ KOMPONENS FELÉ
  // ============================================================

  /** Oldalváltás eseménye */
  @Output() pageChange = new EventEmitter<number>();

  /** Oldalméret-váltás eseménye */
  @Output() pageSizeChange = new EventEmitter<number>();

  // ============================================================
  // GETTERS – LAPOZÁSI ADATOK
  // ============================================================

  /** Összes oldal száma */
  get totalPages(): number {
    if (this.totalPagesOverride !== null) {
      return Math.max(0, this.totalPagesOverride);
    }

    if (this.pageSize <= 0) {
      return 0;
    }

    return Math.ceil(this.totalItems / this.pageSize);
  }

  /** Első megjelenített rekord sorszáma */
  get startItem(): number {
    if (this.totalItems === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /** Utolsó megjelenített rekord sorszáma */
  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  /** Lapozási gombokhoz szükséges oldalszámok */
  get pages(): number[] {
    const total = this.totalPages;
    const limit = Math.max(
      5,
      Number.isFinite(this.maxPageNumbers) ? Math.floor(this.maxPageNumbers) : 7,
    );
    if (total <= limit) return Array.from({ length: total }, (_, index) => index + 1);
    const start = Math.min(
      Math.max(2, this.currentPage - Math.floor((limit - 2) / 2)),
      total - limit + 2,
    );
    const end = Math.min(total - 1, start + limit - 3);
    return [1, ...Array.from({ length: end - start + 1 }, (_, index) => start + index), total];
  }

  /** Van-e előző oldal */
  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /** Van-e következő oldal */
  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  // ============================================================
  // NAVIGÁCIÓ
  // ============================================================

  /** Ugrás egy adott oldalra */
  goToPage(page: number): void {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > this.totalPages ||
      page === this.currentPage
    ) {
      return;
    }

    this.pageChange.emit(page);
  }

  /** Előző oldal */
  previousPage(): void {
    if (this.hasPreviousPage) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /** Következő oldal */
  nextPage(): void {
    if (this.hasNextPage) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /** Első oldal */
  firstPage(): void {
    this.goToPage(1);
  }

  /** Utolsó oldal */
  lastPage(): void {
    this.goToPage(this.totalPages);
  }

  // ============================================================
  // OLDALMÉRET VÁLTÁS
  // ============================================================

  onPageSizeChange(size: number | string): void {
    const newSize = Number(size);

    if (!Number.isInteger(newSize) || newSize <= 0 || newSize === this.pageSize) {
      return;
    }

    this.pageSizeChange.emit(newSize);
  }
}
