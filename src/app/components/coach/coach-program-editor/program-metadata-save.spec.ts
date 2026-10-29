import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CoachWorkspaceService } from '../../../services/coach/coach-workspace.service';
import { CoachProgramEditorComponent } from './coach-program-editor.component';
import type { CoachProgram } from '../../../models/coach-workspace.model';

describe('Program metadata save', () => {
  for (const editDuringReload of [false, true]) {
    it(`preserves metadata edits during ${editDuringReload ? 'reload' : 'save'}`, () => {
      const saved: CoachProgram = {
        programId: 10, programName: 'Submitted name', programDescription: 'Submitted description',
        durationDays: 28, difficultyLevel: 'BEGINNER', startDate: '2026-10-23', endDate: null, workouts: [],
      };
      const reload = new Subject<CoachProgram>();
      const request = new Subject<void>();
      const update = jasmine.createSpy('updateProgram').and.returnValue(request);
      TestBed.configureTestingModule({providers: [
        {provide: CoachWorkspaceService, useValue: {
          getMyWorkouts: () => of([]), updateProgram: update, getProgram: () => reload, getProgramDays: () => of([]),
          getOverview: () => of({clients: []}), getAssignedUserIds: () => of([]),
        }},
        {provide: ActivatedRoute, useValue: {}}, {provide: Router, useValue: {}},
      ]});
      const component = TestBed.runInInjectionContext(() => new CoachProgramEditorComponent());
      component.state.programId = 10;
      component.state.program = saved;
      component.state.loading = false;
      component.state.form = {
        programName: 'Submitted name', programDescription: 'Submitted description', durationDays: 28,
        difficultyLevel: 'BEGINNER', startDate: '2026-10-23',
      };
      component.details.saveDetails();
      if (editDuringReload) { request.next(); request.complete(); }
      component.state.form.programName = 'New unsaved name';
      component.state.form.programDescription = 'New unsaved description';
      if (!editDuringReload) { request.next(); request.complete(); }
      reload.next(saved);
      reload.complete();
      expect(component.state.program?.programName).toBe('Submitted name');
      expect(update.calls.first().args[1].programName).toBe('Submitted name');
      expect(component.state.form.programName).toBe('New unsaved name');
      expect(component.state.form.programDescription).toBe('New unsaved description');
    });
  }
});
