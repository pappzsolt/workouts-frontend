import { ANIMATION_MODULE_TYPE, Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { UserSelectComponent } from './shared/user/user-select.component';
import { CoachProgramSelectComponent } from './shared/programs/coach-program-select.component';
import { FormFieldComponent } from './shared/components/form-field/form-field.component';
import { AppCardComponent } from './shared/components/app-card/app-card.component';
import { UserNameIdService } from '../services/user/user-name-id.service';
import { CoachProgramSelectService } from '../services/coach/coach-program-select/coach-program-select.service';
import { LoggerService } from '../services/logger.service';
import { LoginAuditLogsComponent } from './admin-dashboard/operations/login-audit-logs/login-audit-logs.component';
import { LoginAuditLogsService } from '../services/admin/login-audit-logs.service';
import type { LoginAuditLogQuery } from '../services/admin/login-audit-logs.service';

@Component({
  standalone: true,
  imports: [FormsModule, FormFieldComponent, AppCardComponent],
  template: `
    <app-card variant="outlined">
      <form #form="ngForm" (ngSubmit)="submitted = true">
        <app-form-field labelKey="Weight" controlId="weight">
          <input
            id="weight"
            name="weight"
            type="number"
            min="0"
            step="0.5"
            required
            [(ngModel)]="weight"
            (blur)="savedWeight = weight"
          />
        </app-form-field>
        <button type="submit">Save</button>
      </form>
    </app-card>
  `,
})
class ProjectedFormHost {
  @ViewChild(NgForm) form!: NgForm;
  weight: number | null = null;
  savedWeight: number | null = null;
  submitted = false;
}

describe('Existing shared component migration', () => {
  const providers = [
    provideTranslateService(),
    provideRouter([]),
    { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
  ];

  it('keeps numeric form values, validation, label focus, blur saving and submit through projected wrappers', async () => {
    TestBed.configureTestingModule({ imports: [ProjectedFormHost], providers });
    const fixture = TestBed.createComponent(ProjectedFormHost);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.invalid).toBeTrue();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    fixture.nativeElement.querySelector('label').click();
    expect(document.activeElement).toBe(input);
    input.value = '12.5';
    input.dispatchEvent(new Event('input'));
    input.blur();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.weight).toBe(12.5);
    expect(fixture.componentInstance.savedWeight).toBe(12.5);
    expect(fixture.componentInstance.form.valid).toBeTrue();
    fixture.nativeElement.querySelector('button').click();
    expect(fixture.componentInstance.submitted).toBeTrue();
    fixture.destroy();
  });

  it('keeps the selected user while typing and emits the exact user only after choosing', async () => {
    const users = [
      { id: 7, username: 'Anna' },
      { id: 8, username: 'Béla' },
    ];
    TestBed.configureTestingModule({
      imports: [UserSelectComponent],
      providers: [
        ...providers,
        {
          provide: UserNameIdService,
          useValue: { getAllUsers: () => of({ success: true, data: users }) },
        },
        { provide: LoggerService, useValue: { error() {} } },
      ],
    });
    const fixture = TestBed.createComponent(UserSelectComponent);
    fixture.componentRef.setInput('searchable', true);
    fixture.componentRef.setInput('selectedUserId', 7);
    const selected = jasmine.createSpy('selected');
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.userSelected.subscribe(selected);
    fixture.componentInstance.selectedUserIdChange.subscribe(changed);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#userSelect');
    input.focus();
    input.value = 'bé';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedUserId).toBe(7);
    expect(selected).not.toHaveBeenCalled();
    const options = Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Béla']);
    options[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledOnceWith(8);
    expect(selected).toHaveBeenCalledOnceWith(users[1]);
    expect(input.value).toBe('Béla');
    fixture.destroy();
  });

  it('searches program descriptions without losing the readiness and numeric selection events', async () => {
    const programs = [
      { programId: 7, programName: 'Strength', programDescription: 'Barbell' },
      { programId: 8, programName: 'Recovery', programDescription: 'Mobility' },
    ];
    TestBed.configureTestingModule({
      imports: [CoachProgramSelectComponent],
      providers: [
        ...providers,
        {
          provide: CoachProgramSelectService,
          useValue: { getMyPrograms: () => of({ success: true, data: programs }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(CoachProgramSelectComponent);
    fixture.componentRef.setInput('searchable', true);
    const changed = jasmine.createSpy('changed');
    const ready = jasmine.createSpy('ready');
    fixture.componentInstance.selectedProgramIdChange.subscribe(changed);
    fixture.componentInstance.readyChange.subscribe(ready);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.focus();
    input.value = 'mobility';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).not.toHaveBeenCalled();
    const option = document.querySelector<HTMLElement>('mat-option')!;
    expect(option.textContent).toContain('Recovery');
    option.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledOnceWith(8);
    expect(ready.calls.mostRecent().args).toEqual([true]);
    fixture.destroy();
  });

  it('uses the shared page-size selector while retaining filters and requesting server page zero', async () => {
    const load = jasmine.createSpy('getLoginAuditLogs').and.callFake((query: LoginAuditLogQuery) =>
      of({
        content: [
          {
            id: 1,
            accountType: 'USER',
            accountId: 7,
            username: 'Anna',
            loggedInAt: '2026-10-07T12:00:00Z',
          },
        ],
        page: query.page,
        size: query.size,
        totalElements: 200,
        totalPages: 4,
      }),
    );
    TestBed.configureTestingModule({
      imports: [LoginAuditLogsComponent],
      providers: [
        ...providers,
        { provide: LoginAuditLogsService, useValue: { getLoginAuditLogs: load } },
      ],
    });
    const fixture = TestBed.createComponent(LoginAuditLogsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.filters.username = 'Anna';
    fixture.componentInstance.onPageChange(3);
    fixture.detectChanges();
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('app-pagination select');
    select.value = Array.from(select.options).find(
      (option) => option.textContent?.trim() === '25',
    )!.value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(load.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ page: 0, size: 25, username: 'Anna' }),
    );
    expect(fixture.componentInstance.currentPage).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('app-pagination select').length).toBe(1);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Anna');
    fixture.destroy();
  });

  it('shows the shared loading and empty messages after the API resolves', async () => {
    const result = new Subject<any>();
    TestBed.configureTestingModule({
      imports: [LoginAuditLogsComponent],
      providers: [
        ...providers,
        { provide: LoginAuditLogsService, useValue: { getLoginAuditLogs: () => result } },
      ],
    });
    const fixture = TestBed.createComponent(LoginAuditLogsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('adminLoginAudit.loading');
    result.next({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('adminLoginAudit.noResults');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    fixture.destroy();
  });
});
