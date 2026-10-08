import { ANIMATION_MODULE_TYPE, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AppSelectComponent } from './shared/components/app-select/app-select.component';
import { FormFieldComponent } from './shared/components/form-field/form-field.component';
import { AppButtonComponent } from './shared/components/app-button/app-button.component';
import { AppCardComponent } from './shared/components/app-card/app-card.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from './shared/components/pagination/pagination.component';
import { MessageComponent } from './shared/components/message/message.component';
import { RoleSelectComponent } from './shared/roles/role-select.component';
import { CoachSelectComponent } from './shared/coach/coach-select.component';
import { RoleService } from '../services/roles/role.service';
import { CoachNameIdService } from '../services/coach/coach-name-id.service';
import { LoggerService } from '../services/logger.service';
import { ProgramDetailsFormComponent } from './coach-dashboard/operations/coach-program-builder/program-details-form.component';

@Component({
  standalone: true,
  imports: [AppSelectComponent, ReactiveFormsModule, FormsModule],
  template: ` <app-select [formControl]="control" [searchable]="searchable" [options]="options" />
    <app-select [(ngModel)]="model" [options]="options" />`,
})
class SelectFormsHost {
  control = new FormControl<number | null>(7, Validators.required);
  model: number | null = 7;
  searchable = false;
  options = [
    { value: 7, label: 'first' },
    { value: 9, label: 'second' },
  ];
}
@Component({
  standalone: true,
  imports: [FormFieldComponent],
  template: ` <app-form-field
    labelKey="name"
    controlId="field"
    [hint]="hint"
    error="invalid"
    [showError]="error"
  >
    <input id="field" required aria-describedby="external" aria-invalid="false" />
  </app-form-field>`,
})
class FieldHost {
  hint = 'help';
  error = false;
}
@Component({
  standalone: true,
  imports: [AppCardComponent],
  template: ` <app-card
    [showHeader]="true"
    [showActions]="true"
    padding="md"
    [hover]="false"
    overflow="visible"
  >
    <h2 cardHeader>Heading</h2>
    <form (submit)="submits = submits + 1; $event.preventDefault()">
      <input required /><button>Submit</button>
    </form>
    <span cardActions>Actions</span>
  </app-card>`,
})
class CardHost {
  submits = 0;
}
@Component({
  standalone: true,
  imports: [RoleSelectComponent],
  template: '<app-role-select /><app-role-select />',
})
class RolesHost {}

describe('Shared component extensions preserve consumer contracts', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [
        SelectFormsHost,
        FieldHost,
        CardHost,
        RolesHost,
        ProgramDetailsFormComponent,
        ConfirmDialogComponent,
        AppButtonComponent,
        PaginationComponent,
        MessageComponent,
        CoachSelectComponent,
      ],
      providers: [
        provideTranslateService(),
        { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
        { provide: RoleService, useValue: { getRoles: () => of([]) } },
        {
          provide: CoachNameIdService,
          useValue: {
            getAllCoaches: () =>
              of({
                success: true,
                data: [
                  { id: 7, name: 'Anna' },
                  { id: 9, name: 'Bela' },
                ],
              }),
          },
        },
        { provide: LoggerService, useValue: { error() {} } },
      ],
    }),
  );

  it('round-trips numeric values through reactive and template forms, including touched and disabled state', async () => {
    const fixture = TestBed.createComponent(SelectFormsHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const selects: HTMLSelectElement[] = [...fixture.nativeElement.querySelectorAll('select')];
    selects[0].selectedIndex = 1;
    selects[0].dispatchEvent(new Event('change'));
    selects[1].selectedIndex = 1;
    selects[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.value).toBe(9);
    expect(fixture.componentInstance.control.dirty).toBeTrue();
    expect(fixture.componentInstance.model).toBe(9);
    selects[0].dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.control.touched).toBeTrue();
    fixture.componentInstance.control.setValue(7);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selects[0].selectedIndex).toBe(0);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selects[0].disabled).toBeTrue();
    const component = fixture.debugElement.query(By.directive(AppSelectComponent))
      .componentInstance as AppSelectComponent<number>;
    component.selectSearchOption(9);
    expect(component.value).toBe(7);
    fixture.componentInstance.control.enable();
    fixture.componentInstance.control.reset(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.invalid).toBeTrue();
    expect(fixture.componentInstance.control.pristine).toBeTrue();
  });

  it('does not change a searchable form value while typing, and preserves an active query on translation changes', async () => {
    const fixture = TestBed.createComponent(SelectFormsHost);
    fixture.componentInstance.searchable = true;
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.debugElement.query(By.directive(AppSelectComponent))
      .componentInstance as AppSelectComponent<number>;
    const translated = TestBed.inject(TranslateService);
    translated.setTranslation('hu', { first: 'Elso', second: 'Masodik' });
    translated.setTranslation('en', { first: 'First', second: 'Second' });
    translated.use('hu');
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('Elso');
    input.value = 'Mas';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    translated.use('en');
    fixture.detectChanges();
    expect(input.value).toBe('Mas');
    expect(fixture.componentInstance.control.value).toBe(7);
    component.selectSearchOption(9);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.value).toBe(9);
    expect(input.value).toBe('Second');
  });

  it('merges and removes hint/error descriptions without changing native validation or external ARIA', () => {
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.validity.valueMissing).toBeTrue();
    expect(input.getAttribute('aria-describedby')).toContain('external');
    expect(input.getAttribute('aria-describedby')).toContain(
      fixture.nativeElement.querySelector('p').id,
    );
    fixture.componentInstance.error = true;
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(
      fixture.nativeElement.querySelector('[role=alert]').id,
    );
    fixture.componentInstance.error = false;
    fixture.componentInstance.hint = '';
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toBe('external');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(fixture.nativeElement.querySelector('label').htmlFor).toBe(input.id);
  });

  it('projects card slots and keeps native forms and validation intact', () => {
    const fixture = TestBed.createComponent(CardHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('header h2').textContent).toBe('Heading');
    expect(fixture.nativeElement.querySelector('footer span').textContent).toBe('Actions');
    const panel: HTMLElement = fixture.nativeElement.querySelector('app-card > div');
    expect(panel.classList.contains('overflow-visible')).toBeTrue();
    expect(panel.className).not.toContain('hover:');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.requestSubmit();
    expect(fixture.componentInstance.submits).toBe(0);
    form.querySelector('input')!.value = 'valid';
    form.requestSubmit();
    expect(fixture.componentInstance.submits).toBe(1);
  });

  it('forwards action attributes to the real custom button and preserves disabled clicks', () => {
    const fixture = TestBed.createComponent(AppButtonComponent);
    fixture.componentRef.setInput('appearance', 'custom');
    fixture.componentRef.setInput('testId', 'action');
    fixture.componentRef.setInput('buttonRole', 'tab');
    fixture.componentRef.setInput('ariaSelected', true);
    fixture.componentRef.setInput('tabIndex', 0);
    fixture.componentRef.setInput('buttonClass', 'grid p-2');
    fixture.detectChanges();
    const click = jasmine.createSpy();
    fixture.componentInstance.buttonClick.subscribe(click);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.className).toBe('grid p-2');
    expect(button.getAttribute('data-testid')).toBe('action');
    expect(button.getAttribute('role')).toBe('tab');
    expect(button.getAttribute('aria-selected')).toBe('true');
    button.click();
    expect(click).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button.click();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('keeps selection-row states independent from normal action button colors', () => {
    const fixture = TestBed.createComponent(AppButtonComponent);
    fixture.componentRef.setInput('appearance', 'selection-row');
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.classList.contains('app-button-selection-row-active')).toBeTrue();
    expect(getComputedStyle(button).gridTemplateColumns.split(' ').length).toBe(4);
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    expect(button.classList.contains('app-button-selection-row-active')).toBeFalse();
  });

  it('uses unique dialog descriptions, traps focus and restores the opener without allowing busy cancellation', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    const second = TestBed.createComponent(ConfirmDialogComponent);
    document.body.append(fixture.nativeElement);
    opener.focus();
    try {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('title', 'Delete program');
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();
      await fixture.whenStable();
      const panel: HTMLElement = fixture.nativeElement.querySelector('[role=alertdialog]');
      expect(panel.getAttribute('aria-labelledby')).toBe(
        fixture.nativeElement.querySelector('h2').id,
      );
      expect(fixture.componentInstance.titleId).not.toBe(second.componentInstance.titleId);
      expect(panel.contains(document.activeElement)).toBeTrue();
      expect(fixture.nativeElement.querySelectorAll('.cdk-focus-trap-anchor').length).toBe(2);
      const cancelled = jasmine.createSpy();
      fixture.componentInstance.cancelled.subscribe(cancelled);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();
      fixture.componentInstance.onEscape();
      expect(cancelled).not.toHaveBeenCalled();
      fixture.componentRef.setInput('busy', false);
      fixture.detectChanges();
      fixture.componentInstance.onEscape();
      expect(cancelled).toHaveBeenCalledTimes(1);
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
      expect(document.activeElement).toBe(opener);
    } finally {
      fixture.destroy();
      second.destroy();
      opener.remove();
    }
  });

  it('bounds page buttons at both edges and in the middle, retaining navigation to every page', () => {
    const page = new PaginationComponent();
    page.totalPagesOverride = 1000;
    for (const current of [1, 2, 500, 999, 1000]) {
      page.currentPage = current;
      expect(page.pages.length).toBeLessThanOrEqual(7);
      expect(page.pages[0]).toBe(1);
      expect(page.pages.at(-1)).toBe(1000);
      expect(page.pages).toContain(current);
    }
    page.currentPage = 500;
    const changed = jasmine.createSpy();
    page.pageChange.subscribe(changed);
    page.firstPage();
    page.previousPage();
    page.nextPage();
    page.lastPage();
    page.goToPage(725);
    expect(changed.calls.allArgs()).toEqual([[1], [499], [501], [1000], [725]]);
    page.totalPagesOverride = 3;
    expect(page.pages).toEqual([1, 2, 3]);
  });

  it('renders optional compact live messages while retaining the default message styling', () => {
    const fixture = TestBed.createComponent(MessageComponent);
    fixture.componentRef.setInput('message', 'Saved');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('div').classList.contains('px-4')).toBeTrue();
    fixture.componentRef.setInput('compact', true);
    fixture.componentRef.setInput('role', 'status');
    fixture.componentRef.setInput('ariaLive', 'polite');
    fixture.detectChanges();
    const message: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(message.classList.contains('px-4')).toBeFalse();
    expect(message.getAttribute('role')).toBe('status');
    expect(message.getAttribute('aria-live')).toBe('polite');
  });

  it('assigns each wrapper instance a unique control id with a matching label', async () => {
    const fixture = TestBed.createComponent(RolesHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const controls: HTMLSelectElement[] = [...fixture.nativeElement.querySelectorAll('select')];
    const labels: HTMLLabelElement[] = [...fixture.nativeElement.querySelectorAll('label')];
    expect(controls.length).toBe(2);
    expect(controls[0].id).not.toBe(controls[1].id);
    expect(labels.map((label) => label.htmlFor)).toEqual(controls.map((control) => control.id));
    fixture.destroy();
    const single = TestBed.createComponent(RoleSelectComponent);
    single.detectChanges();
    expect(single.nativeElement.querySelector('select').id).toBe('roleSelect');
  });

  it('retains the legacy coach search behavior and requires explicit selection in the optional combined mode', async () => {
    const fixture = TestBed.createComponent(CoachSelectComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const selected = jasmine.createSpy();
    fixture.componentInstance.selectedCoachIdChange.subscribe(selected);
    fixture.componentInstance.onSearchChange('Bela');
    expect(selected).toHaveBeenCalledOnceWith(9);
    fixture.componentRef.setInput('searchable', true);
    fixture.detectChanges();
    await fixture.whenStable();
    selected.calls.reset();
    expect(fixture.nativeElement.querySelector('app-search')).toBeNull();
    const component = fixture.debugElement.query(By.directive(AppSelectComponent))
      .componentInstance as AppSelectComponent<number>;
    component.onSearchInput('Anna');
    expect(selected).not.toHaveBeenCalled();
    component.selectSearchOption(7);
    expect(selected).toHaveBeenCalledOnceWith(7);
  });

  for (const mode of ['create', 'edit'] as const) {
    it(`preserves ${mode} program model updates, numeric input, native validation and submit`, async () => {
      const fixture = TestBed.createComponent(ProgramDetailsFormComponent);
      const program = {
        programName: '',
        startDate: '',
        durationDays: undefined as number | undefined,
        difficultyLevel: '',
      };
      fixture.componentRef.setInput('mode', mode);
      fixture.componentRef.setInput('program', program);
      fixture.componentRef.setInput('endDate', '2026-10-20');
      fixture.detectChanges();
      await fixture.whenStable();
      const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
      const save = jasmine.createSpy();
      fixture.componentInstance.save.subscribe(save);
      expect(form.checkValidity()).toBeFalse();
      // Invalid required fields must be rejected before the parent's save event.
      form.requestSubmit();
      expect(save).toHaveBeenCalledTimes(0);
      expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('inputValidation.required');
      save.calls.reset();
      const change = (id: string, value: string) => {
        const input: HTMLInputElement = form.querySelector('#' + id)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      };
      change('programName', 'Test');
      change('startDate', '2026-10-07');
      change('durationDays', '14');
      const select: HTMLSelectElement = form.querySelector('select')!;
      select.selectedIndex = 2;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(program.programName).toBe('Test');
      expect(program.startDate).toBe('2026-10-07');
      expect(program.durationDays).toBe(14);
      expect(program.difficultyLevel).toBe('INTERMEDIATE');
      expect((form.querySelector('#endDate') as HTMLInputElement).readOnly).toBeTrue();
      expect((form.querySelector('#endDate') as HTMLInputElement).value).toBe('2026-10-20');
      form.requestSubmit();
      expect(save).toHaveBeenCalledTimes(1);
      change('durationDays', '');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(program.durationDays as unknown).toBeNull();
      form.requestSubmit();
      expect(save).toHaveBeenCalledTimes(2);
    });
  }

  it('keeps the builder save gate and the supplied reactive form validators distinct', async () => {
    const fixture = TestBed.createComponent(ProgramDetailsFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const save = jasmine.createSpy();
    fixture.componentInstance.save.subscribe(save);
    let button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(save).not.toHaveBeenCalled();
    Object.assign(fixture.componentInstance.form, {
      programName: 'Program',
      startDate: '2026-10-07',
      durationDays: 10,
      difficultyLevel: 'BEGINNER',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    button.click();
    expect(save).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('creatingProgram', true);
    fixture.detectChanges();
    button.click();
    expect(save).toHaveBeenCalledTimes(1);
    const form = new FormGroup({
      programName: new FormControl('', Validators.required),
      programDescription: new FormControl(''),
      startDate: new FormControl('', Validators.required),
      durationDays: new FormControl<number | null>(null),
      difficultyLevel: new FormControl(''),
    });
    fixture.componentRef.setInput('mode', 'reactive');
    fixture.componentRef.setInput('reactiveForm', form);
    fixture.detectChanges();
    expect(form.invalid).toBeTrue();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#programName');
    input.value = 'Reactive';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    expect(form.controls.programName.value).toBe('Reactive');
    expect(form.controls.programName.dirty).toBeTrue();
    expect(form.controls.programName.touched).toBeTrue();
    button = fixture.nativeElement.querySelector('button');
    button.click();
    expect(save).toHaveBeenCalledTimes(2);
    expect(form.controls.startDate.hasError('required')).toBeTrue();
  });
});
