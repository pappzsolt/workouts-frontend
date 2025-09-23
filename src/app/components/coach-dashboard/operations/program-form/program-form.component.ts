import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Program, ProgramService } from '../../../../services/coach/coach-program/program.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './program-form.component.html',
})
export class ProgramFormComponent implements OnInit {

  @Input() programId?: number;

  form!: FormGroup;
  isEditMode = false;

  constructor(private fb: FormBuilder, private programService: ProgramService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      duration_days: [null],
      difficulty_level: [''],
      coach_id: [null]
    });

    if (this.programId) {
      this.isEditMode = true;
      this.programService.getById(this.programId).subscribe(program => {
        this.form.patchValue(program);
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    const program: Program = this.form.value;

    if (this.isEditMode && this.programId) {
      this.programService.update(this.programId, program).subscribe(res => {
        alert('Program updated successfully!');
      });
    } else {
      this.programService.create(program).subscribe(res => {
        alert('Program created successfully!');
        this.form.reset();
      });
    }
  }
}
