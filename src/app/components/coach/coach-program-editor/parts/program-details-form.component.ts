import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppFormValidationDirective } from '../../../shared/components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppRadioDirective } from '../../../shared/components/form-controls/app-check.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import type { CoachProgramDetailsInput } from '../../../../models/coach-workspace.model';
import { DIFFICULTY_OPTIONS } from '../../coach-ui';

/** A program adatai (név, leírás, kezdőnap, időtartam, nehézség). Az űrlap objektumát a szülő birtokolja. */
@Component({
  selector: 'app-program-details-form',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    AppRadioDirective,
    CommonModule,
    FormsModule,
    TranslatePipe,
    AppIconComponent,
  ],
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
