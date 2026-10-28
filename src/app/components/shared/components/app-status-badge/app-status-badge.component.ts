import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

/** Edzés- (done, inProgress, missed, planned) és programállapotok (active, upcoming, finished). */
export type AppStatus = 'done' | 'inProgress' | 'missed' | 'planned' | 'active' | 'upcoming' | 'finished' | 'programCompleted' | 'programInProgress';

/** Állapot → jelvény (src/styles.css .badge-*), ikon és fordítási kulcs – egy helyen. */
const STATUS: Record<AppStatus, { classes: string; icon: AppIconName; label: string; iconSize?: string }> = {
  done: { classes: 'badge badge-success', icon: 'circle-check', label: 'coachWorkspace.status.done' },
  inProgress: { classes: 'badge badge-info', icon: 'circle-play', label: 'coachWorkspace.status.inProgress' },
  missed: { classes: 'badge badge-warning', icon: 'triangle-alert', label: 'coachWorkspace.status.missed' },
  planned: { classes: 'badge badge-neutral', icon: 'calendar-clock', label: 'coachWorkspace.status.planned' },
  active: { classes: 'badge badge-success', icon: 'circle-play', label: 'coachWorkspace.client.active' },
  upcoming: { classes: 'badge badge-warning', icon: 'clock', label: 'coachWorkspace.client.upcoming' },
  finished: { classes: 'badge badge-neutral', icon: 'flag', label: 'coachWorkspace.client.finished' },
  programCompleted: {
    classes: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-success-50 text-success-800',
    icon: 'circle-check', label: 'userMyPrograms.completed', iconSize: 'h-4 w-4',
  },
  programInProgress: {
    classes: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-surface-100 text-content-600',
    icon: 'clock', label: 'userMyPrograms.inProgress', iconSize: 'h-4 w-4',
  },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [AppIconComponent, TranslatePipe],
  host: { class: 'inline-flex' },
  template: `
    <span [class]="config.classes">
      <app-icon [name]="config.icon" [sizeClass]="config.iconSize ?? 'h-3.5 w-3.5'" />
      {{ config.label | translate }}
    </span>
  `,
})
export class AppStatusBadgeComponent {
  @Input({ required: true }) status!: AppStatus;

  get config() {
    return STATUS[this.status];
  }
}
