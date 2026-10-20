import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AppIconComponent, AppIconName } from '../app-icon/app-icon.component';

/** Edzés- (done, inProgress, missed, planned) és programállapotok (active, upcoming, finished). */
export type AppStatus = 'done' | 'inProgress' | 'missed' | 'planned' | 'active' | 'upcoming' | 'finished';

/** Állapot → jelvény (src/styles.css .badge-*), ikon és fordítási kulcs – egy helyen. */
const STATUS: Record<AppStatus, { badge: string; icon: AppIconName; label: string }> = {
  done: { badge: 'badge-success', icon: 'circle-check', label: 'coachWorkspace.status.done' },
  inProgress: { badge: 'badge-info', icon: 'circle-play', label: 'coachWorkspace.status.inProgress' },
  missed: { badge: 'badge-warning', icon: 'triangle-alert', label: 'coachWorkspace.status.missed' },
  planned: { badge: 'badge-neutral', icon: 'calendar-clock', label: 'coachWorkspace.status.planned' },
  active: { badge: 'badge-success', icon: 'circle-play', label: 'coachWorkspace.client.active' },
  upcoming: { badge: 'badge-warning', icon: 'clock', label: 'coachWorkspace.client.upcoming' },
  finished: { badge: 'badge-neutral', icon: 'flag', label: 'coachWorkspace.client.finished' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [AppIconComponent, TranslatePipe],
  host: { class: 'inline-flex' },
  template: `
    <span [class]="'badge ' + config.badge">
      <app-icon [name]="config.icon" sizeClass="h-3.5 w-3.5" />
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
