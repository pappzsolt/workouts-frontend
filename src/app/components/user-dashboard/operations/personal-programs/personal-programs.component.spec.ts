import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { PersonalProgramsComponent } from './personal-programs.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { LanguageService } from '../../../../services/shared/language.service';
import type { PersonalProgramSummary, PersonalProgramRequest } from '../../../../models/personal-program.model';

const draftProgram: PersonalProgramSummary = {
  id: 10, name: 'Strength plan', startDate: null, durationDays: 7, startedAt: null, standalone: false,
};
const draftWorkout: PersonalProgramSummary = {
  id: 11, name: 'Solo workout', startDate: null, durationDays: 1, startedAt: null, standalone: true,
};
const startedProgram: PersonalProgramSummary = { ...draftProgram, id: 12, startedAt: '2026-11-14T09:00:00' };
const startedWorkout: PersonalProgramSummary = { ...draftWorkout, id: 13, startedAt: '2026-11-14T09:00:00' };

/** Drafts are deleted; started personal programs are archived without erasing history. */
describe('PersonalProgramsComponent pagination and personal actions', () => {
  let component: PersonalProgramsComponent;
  let api: jasmine.SpyObj<PersonalProgramService>;
  let router: jasmine.SpyObj<Router>;
  beforeEach(() => {
    api = jasmine.createSpyObj('PersonalProgramService', ['listPage', 'delete', 'copy', 'repeat']);
    api.listPage.and.returnValue(of({ content: [], page: 0, size: 12, totalElements: 30, totalPages: 3 }));
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({ providers: [
      { provide: PersonalProgramService, useValue: api },
      { provide: LanguageService, useValue: { language$: new BehaviorSubject('hu') } },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
    ] });
    component = TestBed.runInInjectionContext(() => new PersonalProgramsComponent());
    component.ngOnInit();
  });
  it('calculates the inclusive end date on a program card without affecting standalone workouts', () => {
    expect(component.programEndDate('2026-11-18', 50)).toBe('2027-01-06');
    expect(component.programEndDate(null, 50)).toBeNull();
  });

  it('loads one bounded page and uses server totals', () => {
    expect(api.listPage).toHaveBeenCalledOnceWith(0, 12, false, '');
    expect(component.totalItems).toBe(30);
  });
  it('converts pagination controls to zero-based API pages', () => {
    component.changePage(3);
    expect(api.listPage).toHaveBeenCalledWith(2, 12, false, '');
  });
  it('keeps program queries separate when searching', () => {
    component.changePage(3);
    component.search = '%_';
    component.filtersChanged();
    expect(component.page).toBe(0);
    expect(api.listPage).toHaveBeenCalledWith(0, 12, false, '%_');
  });
  it('requests only standalone workouts on the standalone route, including pagination and search', () => {
    TestBed.inject(ActivatedRoute).snapshot.data['standalone'] = true;
    const workouts = TestBed.runInInjectionContext(() => new PersonalProgramsComponent());
    workouts.ngOnInit();
    expect(api.listPage).toHaveBeenCalledWith(0, 12, true, '');
    workouts.changePage(2);
    expect(api.listPage).toHaveBeenCalledWith(1, 12, true, '');
    workouts.search = 'Solo';
    workouts.filtersChanged();
    expect(api.listPage).toHaveBeenCalledWith(0, 12, true, 'Solo');
  });
  it('opens a confirmation without deleting until confirmed and supports cancellation', () => {
    component.askDelete(draftProgram);
    expect(component.pendingDelete).toBe(draftProgram);
    expect(api.delete).not.toHaveBeenCalled();
    component.cancelDelete();
    expect(component.pendingDelete).toBeNull();
    expect(api.delete).not.toHaveBeenCalled();
  });
  it('deletes a personal program draft and reloads the list', () => {
    api.delete.and.returnValue(of(draftProgram.id));
    component.programs = [draftProgram];
    component.askDelete(draftProgram);
    component.confirmDelete();
    expect(api.delete).toHaveBeenCalledOnceWith(10);
    expect(component.pendingDelete).toBeNull();
    expect(component.successMessage).toBe('personalPrograms.deleteSuccess');
    expect(api.listPage).toHaveBeenCalledTimes(2);
  });
  it('deletes a standalone workout draft using the same existing endpoint', () => {
    api.delete.and.returnValue(of(draftWorkout.id));
    component.programs = [draftWorkout];
    component.askDelete(draftWorkout);
    component.confirmDelete();
    expect(api.delete).toHaveBeenCalledOnceWith(11);
    expect(component.successMessage).toBe('personalWorkouts.deleteSuccess');
  });
  it('goes back a page if the last draft on the page is deleted', () => {
    api.delete.and.returnValue(of(draftProgram.id));
    component.page = 2;
    component.programs = [draftProgram];
    component.askDelete(draftProgram);
    component.confirmDelete();
    expect(component.page).toBe(1);
    expect(api.listPage).toHaveBeenCalledWith(1, 12, false, '');
  });
  it('allows removal of started programs and reports archival instead of hard deletion', () => {
    api.delete.and.returnValue(of(startedProgram.id));
    component.askDelete(startedProgram);
    expect(component.pendingDelete).toBe(startedProgram);
    component.confirmDelete();
    expect(api.delete).toHaveBeenCalledOnceWith(startedProgram.id);
    expect(component.successMessage).toBe('personalPrograms.archiveSuccess');
  });
  it('allows removal of started standalone workouts while retaining their history', () => {
    api.delete.and.returnValue(of(startedWorkout.id));
    component.askDelete(startedWorkout);
    expect(component.pendingDelete).toBe(startedWorkout);
    component.confirmDelete();
    expect(api.delete).toHaveBeenCalledOnceWith(startedWorkout.id);
    expect(component.successMessage).toBe('personalWorkouts.archiveSuccess');
  });
  it('blocks duplicate delete requests while the first request is pending', () => {
    const pending$ = new Subject<number>();
    api.delete.and.returnValue(pending$.asObservable());
    component.askDelete(draftProgram);
    component.confirmDelete();
    component.confirmDelete();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(component.busy).toBeTrue();
    expect(component.pendingDelete).toBe(draftProgram);
    pending$.next(10);
    pending$.complete();
    expect(component.busy).toBeFalse();
  });
  it('displays backend failures without removing the draft from the list', () => {
    api.delete.and.returnValue(throwError(() => new Error('Delete denied')));
    component.programs = [draftProgram];
    component.askDelete(draftProgram);
    component.confirmDelete();
    expect(component.message).toBe('Delete denied');
    expect(component.programs).toEqual([draftProgram]);
    expect(component.pendingDelete).toBeNull();
  });
  it('makes an editable copy of a started personal program', () => {
    api.copy.and.returnValue(of(44));
    component.editCopy(startedProgram);
    expect(api.copy).toHaveBeenCalledOnceWith(12);
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-programs', 44]);
  });
  it('repeats a started standalone workout into an editable draft', () => {
    api.repeat.and.returnValue(of({ id: 45, startedAt: null, standalone: true,
      program: {} as PersonalProgramRequest }));
    component.editCopy(startedWorkout);
    expect(api.repeat).toHaveBeenCalledOnceWith(13);
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-workouts', 45]);
  });
  it('does not make a copy when a draft is already directly editable', () => {
    component.editCopy(draftWorkout);
    component.editCopy(draftProgram);
    expect(api.copy).not.toHaveBeenCalled();
    expect(api.repeat).not.toHaveBeenCalled();
  });
  for (const standalone of [false, true]) {
    it(`retries only navigation after the list creates a ${standalone ? 'workout' : 'program'} copy`, async () => {
      api.copy.and.returnValue(of(44));
      api.repeat.and.returnValue(of({ id: 45, standalone: true, startedAt: null, program: {} as PersonalProgramRequest }));
      router.navigate.and.resolveTo(false);
      const source = standalone ? startedWorkout : startedProgram;
      component.editCopy(source);
      await Promise.resolve();
      expect(component.hasPendingCopy).toBeTrue();
      expect(component.message).toBe('personalNavigation.openFailed');
      component.editCopy(source);
      const write = standalone ? api.repeat : api.copy;
      expect(write).toHaveBeenCalledTimes(1);
      router.navigate.and.resolveTo(true);
      component.retryOpenCopy();
      await Promise.resolve();
      expect(component.hasPendingCopy).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith([
        standalone ? '/user/personal-workouts' : '/user/personal-programs', standalone ? 45 : 44,
      ]);
      expect(write).toHaveBeenCalledTimes(1);
    });
  }

});
