import { CoachProgramBoardComponent } from './shared/coach/coach-program-board/coach-program-board.component';
import { CoachProgramSelectService } from '../services/coach/coach-program-select/coach-program-select.service';
import { AssignWorkoutsExercisesComponent } from './coach-dashboard/operations/assign-workouts-exercises/assign-workouts-exercises.component';
import { WorkoutExerciseService } from '../services/coach/workout-exercises.service';
import { CoachWorkoutsService } from '../services/coach/coach-workouts/coach-workouts.service';
import { ANIMATION_MODULE_TYPE, Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { SHARED_IMPORTS } from './shared/shared-imports';
import { WorkoutCopyDialogComponent } from './coach-dashboard/operations/coach-program-builder/workout-copy-dialog.component';
import { ProgramExerciseDialogComponent } from './coach-dashboard/operations/coach-program-builder/program-exercise-dialog.component';
import { WorkoutsComponent } from './user-dashboard/operations/user-workouts/workouts.component';
import { CoachExercisesBoardComponent } from './shared/coach/coach-exercises-board/coach-exercises-board.component';
import { CoachProgramBuilderWorkoutService } from '../services/coach/coach-program-builder-workout.service';
import { UserWorkoutsService } from '../services/user/user-workouts/user-workouts.service';
import { ExerciseService } from '../services/coach/coach-exercises/coach-exercises.service';
import { LanguageService } from '../services/shared/language.service';
import { LoggerService } from '../services/logger.service';
import { Exercise } from '../models/exercise.model';
import { UserWorkoutOccurrence } from '../models/user-workout-occurrence.model';

@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: ` <form appProfileFields #form="ngForm" (ngSubmit)="submits = submits + 1">
    <app-form-field labelKey="Weight" controlId="weight">
      <input
        appInput="editor"
        class="extra"
        id="weight"
        name="weight"
        type="number"
        required
        min="1"
        max="100"
        step="0.5"
        [(ngModel)]="weight"
        (blur)="saved = weight"
      />
    </app-form-field>
    <input appInput="admin" name="email" type="email" email required [(ngModel)]="email" />
    <textarea
      appTextarea="editor"
      name="notes"
      rows="4"
      minlength="3"
      [(ngModel)]="notes"
    ></textarea>
    <label for="check"
      ><input
        appCheckbox="selection"
        id="check"
        name="check"
        type="checkbox"
        [(ngModel)]="checked"
        (change)="lastTarget = $event.target"
        [indeterminate]="indeterminate"
    /></label>
    <input
      appRadio="card"
      type="radio"
      id="radio1"
      name="choice"
      value="one"
      [(ngModel)]="choice"
    /><label for="radio1">One</label>
    <input
      appRadio="card"
      type="radio"
      id="radio2"
      name="choice"
      value="two"
      [(ngModel)]="choice"
    /><label for="radio2">Two</label>
    <input appInput="readonly" name="read" value="keep" readonly />
    <button type="submit">Save</button>
  </form>`,
})
class NativeFormsHost {
  @ViewChild(NgForm) form!: NgForm;
  weight: number | null = null;
  saved: number | null = null;
  email = '';
  notes = '';
  checked = false;
  choice = 'one';
  indeterminate = true;
  lastTarget: EventTarget | null = null;
  submits = 0;
}
@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS, ReactiveFormsModule],
  template: ` <form appProfileFields [formGroup]="form">
    <input appInput="admin" name="name" formControlName="name" /><textarea
      appTextarea="admin"
      formControlName="notes"
      rows="3"
    ></textarea>
    <input appCheckbox="plain" type="checkbox" formControlName="done" />
  </form>`,
})
class ReactiveHost {
  form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    notes: new FormControl(''),
    done: new FormControl(false),
  });
}
@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: ` @if (open) {
    <app-dialog
      [ariaLabel]="'Example'"
      [trapFocus]="trap"
      [busy]="busy"
      [closeOnEscape]="dismiss"
      [closeOnBackdrop]="dismiss"
      (dismissed)="dismissed = dismissed + 1"
    >
      <header dialogHeader><h2 id="title">Title</h2></header>
      <form #form="ngForm" (ngSubmit)="submits = submits + 1">
        <input appInput="default" name="value" [(ngModel)]="value" /><button>Save</button>
      </form>
      <footer dialogActions><button type="button" (click)="open = false">Close</button></footer>
    </app-dialog>
  }`,
})
class DialogHost {
  open = true;
  trap = false;
  busy = false;
  dismiss = false;
  dismissed = 0;
  submits = 0;
  value = '';
}
@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: ` <app-tabs
      #tabs
      [activeTab]="active"
      (activeTabChange)="active = $event; changes = changes + 1"
      ariaLabel="Views"
    >
      <button appTab="first" type="button">First</button
      ><button appTab="disabled" type="button" disabled>Disabled</button
      ><button appTab="second" type="button">Second</button>
    </app-tabs>
    <section
      role="tabpanel"
      [id]="tabs.panelId(active)"
      [attr.aria-labelledby]="tabs.tabId(active)"
    >
      {{ active }}
    </section>`,
})
class TabsHost {
  active = 'first';
  changes = 0;
}
@Component({
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: ` <div appPageHeader>
      <h2 appHeading="page">Page</h2>
      <p>Description</p>
      <button (click)="clicks = clicks + 1">Action</button>
    </div>
    <div appSectionHeader>
      <h3 appHeading="section">Section</h3>
      <span appBadge="counter" [ngClass]="completed ? 'bg-success-50' : 'bg-primary-50'">{{
        count
      }}</span>
    </div>
    <app-loading message="Loading" /><app-empty-state message="No items" />
    <table appTable>
      <thead>
        <tr>
          <th appTableHeader scope="col">Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td appTableCell="comfortable" class="text-content-600">
            <button (click)="clicks = clicks + 1">Row</button>
          </td>
        </tr>
      </tbody>
    </table>`,
})
class PresentationHost {
  count = 2;
  completed = false;
  clicks = 0;
}

const providers = [
  provideTranslateService(),
  provideRouter([]),
  { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
  { provide: LoggerService, useValue: { error() {} } },
];
const language = { language$: new BehaviorSubject('hu'), getCurrentLanguage: () => 'hu' };
const input = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event('input'));
};

describe('New shared presentation components preserve native contracts', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [
        NativeFormsHost,
        ReactiveHost,
        DialogHost,
        TabsHost,
        PresentationHost,
        WorkoutCopyDialogComponent,
      ],
      providers,
    }),
  );

  it('keeps template form registration, validation, numeric/null values, touched/dirty, label focus, blur and submit', async () => {
    const fixture = TestBed.createComponent(NativeFormsHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(Object.keys(host.form.controls).sort()).toEqual([
      'check',
      'choice',
      'email',
      'notes',
      'weight',
    ]);
    expect(host.form.invalid).toBeTrue();
    const weight: HTMLInputElement = fixture.nativeElement.querySelector('#weight');
    fixture.nativeElement.querySelector('label[for=weight]').click();
    expect(document.activeElement).toBe(weight);
    input(weight, '12.5');
    weight.blur();
    input(fixture.nativeElement.querySelector('[name=email]'), 'user@example.com');
    input(fixture.nativeElement.querySelector('textarea'), 'Notes');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.weight).toBe(12.5);
    expect(host.saved).toBe(12.5);
    expect(host.form.valid).toBeTrue();
    expect(host.form.controls['weight'].dirty).toBeTrue();
    expect(host.form.controls['weight'].touched).toBeTrue();
    expect(weight.classList.contains('extra')).toBeTrue();
    expect(weight.classList.contains('rounded-xl')).toBeTrue();
    expect(weight.step).toBe('0.5');
    expect(weight.min).toBe('1');
    expect(weight.max).toBe('100');
    fixture.nativeElement.querySelector('button').click();
    expect(host.submits).toBe(1);
    input(weight, '0');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.form.controls['weight'].hasError('min')).toBeTrue();
    input(weight, '');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.weight).toBeNull();
    expect(host.form.controls['weight'].hasError('required')).toBeTrue();
    expect(
      (fixture.nativeElement.querySelector('[name=read]') as HTMLInputElement).readOnly,
    ).toBeTrue();
  });

  it('retains native checkbox/radio label clicks and the actual Event.target input', async () => {
    const fixture = TestBed.createComponent(NativeFormsHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const check: HTMLInputElement = fixture.nativeElement.querySelector('#check');
    expect(check.indeterminate).toBeTrue();
    fixture.nativeElement.querySelector('label[for=check]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked).toBeTrue();
    expect(fixture.componentInstance.lastTarget).toBe(check);
    fixture.nativeElement.querySelector('label[for=radio2]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.choice).toBe('two');
    expect(fixture.nativeElement.querySelector('#radio1').checked).toBeFalse();
    expect(fixture.nativeElement.querySelector('#radio2').classList.contains('peer')).toBeTrue();
    expect(fixture.nativeElement.querySelector('textarea').rows).toBe(4);
    fixture.componentInstance.form.resetForm();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(check.checked).toBeFalse();
    expect(fixture.componentInstance.form.pristine).toBeTrue();
  });

  it('preserves reactive validators, disable/enable and reset on the same native fields', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;
    const name: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(form.controls.name.hasError('required')).toBeTrue();
    input(name, 'ab');
    name.dispatchEvent(new Event('blur'));
    expect(form.controls.name.hasError('minlength')).toBeTrue();
    expect(form.controls.name.touched).toBeTrue();
    input(name, 'valid');
    expect(form.valid).toBeTrue();
    form.disable();
    fixture.detectChanges();
    expect(name.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('textarea').disabled).toBeTrue();
    form.enable();
    form.reset();
    fixture.detectChanges();
    expect(name.disabled).toBeFalse();
    expect(name.value).toBe('');
    expect(form.pristine).toBeTrue();
  });

  it('keeps dialog forms and slot order, without introducing Escape or backdrop closing by default', async () => {
    const fixture = TestBed.createComponent(DialogHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const role: HTMLElement = fixture.nativeElement.querySelector('[role=dialog]');
    expect(role.getAttribute('aria-label')).toBe('Example');
    expect(role.getAttribute('aria-modal')).toBe('true');
    const panel = role.querySelector('form')!.parentElement!;
    expect(
      [...panel.children].filter((child) => child.tagName !== 'DIV').map((child) => child.tagName),
    ).toEqual(['HEADER', 'FORM', 'FOOTER']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    role.click();
    expect(fixture.componentInstance.dismissed).toBe(0);
    input(fixture.nativeElement.querySelector('input'), 'Typed');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.value).toBe('Typed');
    fixture.nativeElement.querySelector('form button').click();
    expect(fixture.componentInstance.submits).toBe(1);
  });

  it('allows explicit dialog dismissal while blocking it during a busy action and ignoring content clicks', () => {
    const fixture = TestBed.createComponent(DialogHost);
    fixture.componentInstance.dismiss = true;
    fixture.detectChanges();
    const backdrop: HTMLElement = fixture.nativeElement.querySelector('[role=dialog]');
    fixture.nativeElement.querySelector('h2').click();
    expect(fixture.componentInstance.dismissed).toBe(0);
    backdrop.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.dismissed).toBe(2);
    fixture.componentInstance.busy = true;
    fixture.detectChanges();
    backdrop.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.dismissed).toBe(2);
  });

  it('captures and restores focus only when requested, without saving or dismissing', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const fixture = TestBed.createComponent(DialogHost);
    fixture.componentInstance.trap = true;
    try {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(
        fixture.nativeElement.querySelector('[role=dialog]').contains(document.activeElement),
      ).toBeTrue();
      fixture.componentInstance.open = false;
      fixture.detectChanges();
      expect(document.activeElement).toBe(opener);
      expect(fixture.componentInstance.submits).toBe(0);
      expect(fixture.componentInstance.dismissed).toBe(0);
    } finally {
      fixture.destroy();
      opener.remove();
    }
  });

  it('moves tab focus without changing lists, skips disabled tabs and uses explicit activation', () => {
    const fixture = TestBed.createComponent(TabsHost);
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(buttons[2]);
    expect(fixture.componentInstance.active).toBe('first');
    expect(fixture.componentInstance.changes).toBe(0);
    expect(buttons[2].tabIndex).toBe(0);
    expect(buttons[1].tabIndex).toBe(-1);
    buttons[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active).toBe('second');
    expect(fixture.componentInstance.changes).toBe(1);
    expect(buttons[2].getAttribute('aria-selected')).toBe('true');
    const panel = fixture.nativeElement.querySelector('[role=tabpanel]');
    expect(panel.id).toBe(buttons[2].getAttribute('aria-controls'));
    expect(panel.getAttribute('aria-labelledby')).toBe(buttons[2].id);
    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(document.activeElement).toBe(buttons[0]);
    buttons[1].dispatchEvent(new Event('click'));
    expect(fixture.componentInstance.changes).toBe(1);
  });

  it('retains heading semantics, dynamic badge classes/counts and native table actions', () => {
    const fixture = TestBed.createComponent(PresentationHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Page');
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Section');
    const badge: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(badge.classList.contains('rounded-full')).toBeTrue();
    expect(badge.classList.contains('bg-primary-50')).toBeTrue();
    fixture.componentInstance.completed = true;
    fixture.componentInstance.count = 4;
    fixture.detectChanges();
    expect(badge.textContent).toBe('4');
    expect(badge.classList.contains('bg-success-50')).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-loading').getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.querySelector('app-empty-state').textContent).toContain(
      'No items',
    );
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table');
    expect(table.rows.length).toBe(2);
    expect(table.querySelector('th')!.scope).toBe('col');
    expect(table.querySelector('td')!.classList.contains('px-5')).toBeTrue();
    table.querySelector('button')!.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('keeps copy-dialog field outputs and its existing confirmation and cancellation gates', async () => {
    const fixture = TestBed.createComponent(WorkoutCopyDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const day = jasmine.createSpy();
    const confirmed = jasmine.createSpy();
    const cancelled = jasmine.createSpy();
    fixture.componentInstance.dayIndexChange.subscribe(day);
    fixture.componentInstance.confirm.subscribe(confirmed);
    fixture.componentInstance.cancel.subscribe(cancelled);
    input(fixture.nativeElement.querySelector('#copyWorkoutDayIndex'), '3');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(day).toHaveBeenCalledOnceWith(3);
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    buttons.at(-1)!.click();
    expect(confirmed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('workoutName', 'Copy');
    fixture.componentRef.setInput('workoutDate', '2026-10-07');
    fixture.componentRef.setInput('dayIndex', 3);
    fixture.detectChanges();
    await fixture.whenStable();
    buttons.at(-1)!.click();
    expect(confirmed).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('inProgress', true);
    fixture.detectChanges();
    await fixture.whenStable();
    buttons.forEach((button) => button.click());
    expect(cancelled).not.toHaveBeenCalled();
    expect(confirmed).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.nativeElement.querySelector('[role=dialog]').click();
    expect(cancelled).not.toHaveBeenCalled();
  });
});

describe('Migrated business screens use the same parent actions', () => {
  const exercise: Exercise = { id: 7, name: 'Squat' };
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [
        ProgramExerciseDialogComponent,
        CoachExercisesBoardComponent,
        WorkoutsComponent,
        CoachProgramBoardComponent,
        AssignWorkoutsExercisesComponent,
      ],
      providers: [
        ...providers,
        { provide: LanguageService, useValue: language },
        {
          provide: ExerciseService,
          useValue: { getAllExercises: () => of({ success: true, data: [exercise] }) },
        },
      ],
    }),
  );

  it('retains checkbox identity and locked selection in the real exercise board', async () => {
    const fixture = TestBed.createComponent(CoachExercisesBoardComponent);
    fixture.componentRef.setInput('externalExercises', [exercise]);
    fixture.componentRef.setInput('compactSelection', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const selected = jasmine.createSpy();
    fixture.componentInstance.exercisesChange.subscribe(selected);
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    checkbox.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selected).toHaveBeenCalledOnceWith([exercise]);
    fixture.componentRef.setInput('lockSelectedExercises', true);
    fixture.detectChanges();
    checkbox.click();
    expect(selected).toHaveBeenCalledTimes(1);
    expect(checkbox.disabled).toBeTrue();
  });

  it('keeps numeric radio selection and label activation in the real program board', async () => {
    TestBed.overrideProvider(CoachProgramSelectService, { useValue: {} });
    const fixture = TestBed.createComponent(CoachProgramBoardComponent);
    fixture.componentRef.setInput('programs', [{ programId: 19, programName: 'Program' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    const selected = jasmine.createSpy();
    fixture.componentInstance.programSelected.subscribe(selected);
    fixture.nativeElement.querySelector('label[for=program-19]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selected).toHaveBeenCalledOnceWith(19);
    expect(fixture.componentInstance.selectedProgramId).toBe(19);
    expect(fixture.nativeElement.querySelector('input[type=radio]').checked).toBeTrue();
  });

  it('keeps assignment modal selections on close and does not save on Escape or backdrop clicks', async () => {
    const save = jasmine.createSpy();
    TestBed.overrideProvider(WorkoutExerciseService, {
      useValue: { assignExerciseToWorkout: save },
    });
    TestBed.overrideProvider(CoachWorkoutsService, { useValue: {} });
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
      },
    });
    const fixture = TestBed.createComponent(AssignWorkoutsExercisesComponent);
    fixture.componentInstance.selectedWorkout = { id: 12, name: 'Workout', exercises: [] };
    fixture.componentInstance.selectedWorkoutIds = [12];
    fixture.componentInstance.selectedExercises = [exercise];
    fixture.componentInstance.exerciseSelectorOpen = true;
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role=dialog]');
    expect(dialog.getAttribute('aria-labelledby')).toBe('exercise-selector-title');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    dialog.click();
    expect(fixture.componentInstance.exerciseSelectorOpen).toBeTrue();
    expect(save).not.toHaveBeenCalled();
    const close = spyOn(fixture.componentInstance, 'closeExerciseSelector').and.callThrough();
    const buttons: HTMLButtonElement[] = [...dialog.querySelectorAll('button')];
    buttons.at(-1)!.click();
    fixture.detectChanges();
    expect(close).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeNull();
    expect(fixture.componentInstance.selectedExercises).toEqual([exercise]);
    expect(fixture.componentInstance.selectedWorkoutIds).toEqual([12]);
    expect(save).not.toHaveBeenCalled();
  });

  it('submits the same exercise IDs exactly once through the migrated modal save button', async () => {
    const pending = new Subject<any>();
    const workout = { id: 12, name: 'Workout', exercises: [] };
    const service = {
      getWorkoutExercises: jasmine.createSpy().and.returnValue(of(workout)),
      loadExercises: jasmine.createSpy().and.returnValue(of({ success: true, data: [exercise] })),
      saveExercises: jasmine.createSpy().and.returnValue(pending),
    };
    TestBed.overrideProvider(CoachProgramBuilderWorkoutService, { useValue: service });
    const fixture = TestBed.createComponent(ProgramExerciseDialogComponent);
    fixture.componentRef.setInput('workoutId', 12);
    fixture.componentRef.setInput('exerciseDialogIsNewWorkout', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(service.getWorkoutExercises).toHaveBeenCalledOnceWith(12);
    expect(service.loadExercises).toHaveBeenCalledTimes(1);
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    checkbox.click();
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('[role=dialog] > div > [dialogActions] button'),
    ];
    const saved = jasmine.createSpy();
    const closed = jasmine.createSpy();
    fixture.componentInstance.workoutSaved.subscribe(saved);
    fixture.componentInstance.close.subscribe(closed);
    buttons.at(-1)!.click();
    fixture.detectChanges();
    buttons.at(-1)!.click();
    expect(service.saveExercises).toHaveBeenCalledOnceWith(12, [exercise]);
    expect(fixture.componentInstance.loadingExercises).toBeTrue();
    pending.next({ results: [{ success: true }], workout });
    fixture.detectChanges();
    expect(saved).toHaveBeenCalledOnceWith(workout);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('switches real workout tabs without new API requests or pagination resets and preserves occurrence navigation', async () => {
    const pending = {
      workoutId: 11,
      workoutName: 'Pending',
      userWorkoutId: 41,
      programWorkoutId: 31,
      completed: false,
    } as UserWorkoutOccurrence;
    const completed = {
      workoutId: 12,
      workoutName: 'Completed',
      userWorkoutId: 42,
      programWorkoutId: 32,
      completed: true,
    } as UserWorkoutOccurrence;
    const load = jasmine
      .createSpy()
      .and.returnValue(of({ success: true, data: [pending, completed] }));
    TestBed.overrideProvider(UserWorkoutsService, { useValue: { getWorkoutsByProgram: load } });
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ id: '5' }),
          queryParamMap: convertToParamMap({ programName: 'Program' }),
        },
      },
    });
    const fixture = TestBed.createComponent(WorkoutsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load).toHaveBeenCalledOnceWith(5);
    const buttons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('button[role=tab]'),
    ];
    const setTab = spyOn(fixture.componentInstance, 'setActiveTab').and.callThrough();
    buttons[1].click();
    fixture.detectChanges();
    expect(setTab).toHaveBeenCalledOnceWith('completed');
    expect(fixture.componentInstance.activeTab).toBe('completed');
    expect(load).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.pendingWorkouts).toEqual([pending]);
    expect(fixture.componentInstance.completedWorkouts).toEqual([completed]);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.componentInstance.goToExercises(completed);
    expect(navigate).toHaveBeenCalledOnceWith(['/user/workouts', 12, 'exercises'], {
      queryParams: {
        programId: 5,
        programWorkoutId: 32,
        userWorkoutId: 42,
        workoutName: 'Completed',
      },
    });
    fixture.componentInstance.pendingCurrentPage = 2;
    buttons[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.pendingCurrentPage).toBe(2);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
