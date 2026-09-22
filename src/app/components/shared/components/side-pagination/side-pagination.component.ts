import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-side-pagination',
  standalone: true,
  imports: [CommonModule, LucideChevronLeft, LucideChevronRight],
  templateUrl: './side-pagination.component.html',
  styleUrl: './side-pagination.component.css',
})
export class SidePaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 0;

  /**
   * A kártya teljes rendelkezésre álló szélességet használ.
   * Alapértelmezés: false, így a meglévő oldalak viselkedése nem változik.
   */
  @Input() fullWidth = false;

  /**
   * Mobilon teljes szélességű kártya.
   * Meglévő működés megtartása miatt marad.
   */
  @Input() fullWidthMobile = false;

  @Output() pageChange = new EventEmitter<number>();

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}
