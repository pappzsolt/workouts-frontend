import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { Program } from '../../../../models/program.model';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import { ProgramBuilderFormState } from '../../../../models/program-builder-form-state';

@Component({
  selector: 'app-program-details-form',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent, ReactiveFormsModule],
  templateUrl: './program-details-form.component.html',
})
export class ProgramDetailsFormComponent {
  get labelPrefix(): string {
    return this.mode === 'edit' ? 'coachProgramEdit.' : 'coachNewProgram.';
  }
  @Input() mode: 'builder' | 'create' | 'edit' | 'reactive' = 'builder';
  @Input() program: Program = {};
  @Input() reactiveForm: FormGroup | null = null;
  @Input() endDate = '';
  @Input() form = new ProgramBuilderFormState();
  @Input() isEditMode = false;
  @Input() creatingProgram = false;
  @Output() readonly save = new EventEmitter<void>();
}
