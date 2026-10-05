import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import { ProgramBuilderFormState } from '../../../../models/program-builder-form-state';

@Component({
  selector: 'app-program-details-form', standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  templateUrl: './program-details-form.component.html',
})
export class ProgramDetailsFormComponent {
  @Input() form = new ProgramBuilderFormState();
  @Input() isEditMode = false;
  @Input() creatingProgram = false;
  @Output() readonly save = new EventEmitter<void>();
}
