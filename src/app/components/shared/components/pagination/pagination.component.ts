import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-pagination',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
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
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
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
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
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

    if (newSize <= 0 || newSize === this.pageSize) {
      return;
    }

    this.pageSizeChange.emit(newSize);
  }
}
