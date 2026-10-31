import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Exercise } from '../../../../../../models/exercise.model';
import { AppSearchComponent } from '../../../../../shared/components/app-search/app-search.component';
import { AppBadgeComponent } from '../../../../../shared/components/app-badge/app-badge.component';
import { AppLoadingComponent } from '../../../../../shared/components/app-state/app-state.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../../../shared/components/message/message.component';
import { AppButtonComponent } from '../../../../../shared/components/app-button/app-button.component';
import { AppIconComponent } from '../../../../../shared/components/app-icon/app-icon.component';

/** Gyakorlat keresése, kiválasztása és hozzáadása a programon kívüli edzéshez. */
@Component({
  selector: 'app-workout-exercise-search',
  standalone: true,
  imports: [
    AppSearchComponent,
    AppBadgeComponent,
    AppLoadingComponent,
    CommonModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    AppIconComponent,
  ],
  templateUrl: './workout-exercise-search.component.html',
  host: { class: 'contents' },
})
export class WorkoutExerciseSearchComponent {
  /** A még hozzá nem adott, a keresésnek megfelelő gyakorlatok. */
  @Input({ required: true }) exercises: Exercise[] = [];
  /** Van-e egyáltalán betöltött gyakorlat (az üres lista üzenetéhez). */
  @Input() hasExercises = false;
  @Input() searchTerm = '';
  @Input() selectedId: number | null = null;
  @Input() selectedName = '';
  @Input() loading = false;
  @Input() adding = false;
  @Input() addDisabled = false;

  @Output() readonly searchTermChange = new EventEmitter<string>();
  @Output() readonly exerciseSelected = new EventEmitter<number | undefined>();
  @Output() readonly add = new EventEmitter<void>();
}
