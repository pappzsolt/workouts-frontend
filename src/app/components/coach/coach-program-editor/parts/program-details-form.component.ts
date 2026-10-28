import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import type { CoachProgramDetailsInput } from '../../../../models/coach-workspace.model';
import { DIFFICULTY_OPTIONS } from '../../coach-ui';

/** A program adatai (név, leírás, kezdőnap, időtartam, nehézség). Az űrlap objektumát a szülő birtokolja. */
@Component({
  selector: 'app-program-details-form',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './program-details-form.component.html',
  host: { class: 'contents' },
})
export class ProgramDetailsFormComponent {
  readonly difficultyOptions = DIFFICULTY_OPTIONS;
  @Input({ required: true }) form!: CoachProgramDetailsInput;
  @Input() isNew = false;
  @Input() saving = false;
  @Input() submitDisabled = false;
  @Output() readonly save = new EventEmitter<void>();
}
