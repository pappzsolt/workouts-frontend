import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  LucideActivity,
  LucideArrowDownWideNarrow,
  LucideArrowUpNarrowWide,
  LucideBookOpen,
  LucideCalendarDays,
  LucideChartColumnIncreasing,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircle,
  LucideCircleCheck,
  LucideCirclePlus,
  LucideCircleX,
  LucideClipboardList,
  LucideDumbbell,
  LucideFileText,
  LucideFlame,
  LucideLink,
  LucideMenu,
  LucidePencil,
  LucidePlus,
  LucideSave,
  LucideSearch,
  LucideTimer,
  LucideUserPlus,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';

export type AppIconName =
  | 'activity' | 'arrow-down-wide-narrow' | 'arrow-up-narrow-wide' | 'book-open'
  | 'calendar-days' | 'chart-column-increasing' | 'chevron-left' | 'chevron-right'
  | 'circle' | 'circle-check' | 'circle-plus' | 'circle-x' | 'clipboard-list'
  | 'dumbbell' | 'file-text' | 'flame' | 'link' | 'menu' | 'pencil' | 'plus'
  | 'save' | 'search' | 'timer' | 'user-plus' | 'user-round' | 'users' | 'x';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [
    CommonModule,
    LucideActivity,
    LucideArrowDownWideNarrow,
    LucideArrowUpNarrowWide,
    LucideBookOpen,
    LucideCalendarDays,
    LucideChartColumnIncreasing,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircle,
    LucideCircleCheck,
    LucideCirclePlus,
    LucideCircleX,
    LucideClipboardList,
    LucideDumbbell,
    LucideFileText,
    LucideFlame,
    LucideLink,
    LucideMenu,
    LucidePencil,
    LucidePlus,
    LucideSave,
    LucideSearch,
    LucideTimer,
    LucideUserPlus,
    LucideUserRound,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './app-icon.component.html',
  styles: [':host { display: inline-flex; flex: none; align-items: center; justify-content: center; line-height: 1; }'],
})
export class AppIconComponent {
  @Input({ required: true }) name!: AppIconName;
  @Input() sizeClass = 'h-5 w-5';
  @Input() strokeWidth = 2;
}
