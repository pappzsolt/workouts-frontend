import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-side-pagination',
  standalone: true,
  imports: [CommonModule, AppIconComponent, TranslatePipe],
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
