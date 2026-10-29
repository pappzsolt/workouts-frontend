import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { NgForm } from '@angular/forms';
import type { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import type { PersonalProgramDetail } from '../../../../models/personal-program.model';
import type { PersonalProgramService } from '../../../../services/user/personal-program.service';
import type { PersonalProgramState } from './personal-program-state';
import type { PersonalProgramDays } from './personal-program-days';
import type { PersonalProgramNavigation } from './personal-program-navigation';

/** Persisting, starting, copying, repeating and deleting personal drafts. */
export class PersonalProgramActions {
  constructor(
    private readonly state: PersonalProgramState,
    private readonly days: PersonalProgramDays,
    private readonly navigation: PersonalProgramNavigation,
    private readonly service: PersonalProgramService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
  ) {}

  save(form: NgForm): void {
    if (this.state.locked || form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    const days = this.state.model.workouts.map((day) => day.dayIndex);
    if (new Set(days).size !== days.length || days.some((day) => day > this.state.model.durationDays)) {
      this.state.message = 'personalPrograms.invalidDays';
      this.state.messageType = 'error';
      return;
    }
    if (!this.state.withinLimits) {
      this.state.message = 'personalPrograms.sizeLimit';
      this.state.messageType = 'error';
      return;
    }
    this.state.busy = true;
    this.state.message = '';
    const request = {
      ...this.state.model,
      ...(this.state.standaloneMode
        ? {
            durationDays: 1,
            workouts: [
              {
                ...this.state.model.workouts[0],
                dayIndex: 1,
                name: this.state.model.name,
                description: this.state.model.description,
              },
            ],
          }
        : {}),
      startDate: this.state.model.startDate || null,
      difficultyLevel: this.state.model.difficultyLevel || null,
    };
    this.service
      .save(this.state.id, request, this.state.standaloneMode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.state.busy = false;
          this.state.dirty = false;
          this.state.message = this.state.label('saved');
          this.state.messageType = 'success';
          if (this.state.id == null)
            void this.router.navigate(
              [
                this.state.standaloneMode ? '/user/personal-workouts' : '/user/personal-programs',
                typeof result === 'number' ? result : result.id,
              ],
              { replaceUrl: true },
            );
          else if (typeof result !== 'number') {
            this.state.model = result.program;
            this.state.started = result.startedAt != null;
            this.days.pickerDay = null;
          }
        },
        error: (error) => {
          this.state.busy = false;
          this.state.fail(error);
        },
      });
  }

  saveTemplate(): void {
    if (
      this.state.id == null ||
      !this.state.standaloneMode ||
      this.state.busy ||
      this.state.loading ||
      this.state.loadFailed ||
      this.state.dirty ||
      this.state.model.expectedVersion == null
    )
      return;
    this.state.busy = true;
    this.state.message = '';
    this.service
      .saveTemplate(this.state.id, this.state.model.expectedVersion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.busy = false;
          this.state.message = 'workoutTemplates.saved';
          this.state.messageType = 'success';
        },
        error: (error) => {
          this.state.busy = false;
          this.state.fail(error);
        },
      });
  }

  ask(action: 'start' | 'delete' | 'copy' | 'repeat'): void {
    if (this.state.busy || this.state.id == null || this.state.loading || this.state.loadFailed) return;
    if (action === 'start' && !this.state.canStart) return;
    if (action === 'delete' && this.state.started) return;
    if (action === 'copy' && this.state.dirty) return;
    if (action === 'repeat' && (!this.state.standaloneMode || !this.state.started || this.state.dirty)) return;
    this.state.action = action;
  }

  confirm(): void {
    if (this.state.action === 'leave') {
      this.state.dirty = false;
      this.navigation.finishLeave(true);
      return;
    }
    if (this.state.id == null || this.state.busy || this.state.action == null) return;
    const action = this.state.action;
    if (action === 'start' && !this.state.canStart) {
      this.state.action = null;
      return;
    }
    const request: Observable<number | PersonalProgramDetail> =
      action === 'repeat'
        ? this.service.repeat(this.state.id)
        : action === 'start'
          ? this.service.start(this.state.id)
          : action === 'copy'
            ? this.service.copy(this.state.id)
            : this.service.delete(this.state.id);
    this.state.busy = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.state.busy = false;
        this.state.action = null;
        this.state.dirty = false;
        if (action === 'start' && typeof result !== 'number') {
          this.state.model = result.program;
          this.state.started = result.startedAt != null;
          this.days.pickerDay = null;
          this.state.message = this.state.label('startSuccess');
          this.state.messageType = 'success';
        } else
          void this.router.navigate(
            action === 'repeat' && typeof result !== 'number'
              ? ['/user/personal-workouts', result.id]
              : action === 'copy'
                ? [
                    this.state.standaloneMode ? '/user/personal-workouts' : '/user/personal-programs',
                    result,
                  ]
                : ['/user/personal-programs'],
          );
      },
      error: (error) => {
        this.state.busy = false;
        this.state.action = null;
        this.state.fail(error);
      },
    });
  }

  get confirmationTitle(): string {
    return this.state.action === 'leave'
      ? 'personalPrograms.leaveTitle'
      : this.state.label(`${this.state.action}Title`);
  }

  get confirmationMessage(): string {
    return this.state.action === 'leave'
      ? 'personalPrograms.leaveConfirm'
      : this.state.label(`${this.state.action}Confirm`);
  }
}
