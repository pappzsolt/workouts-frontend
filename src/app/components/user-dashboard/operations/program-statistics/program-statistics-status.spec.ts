import { UserProgramStatisticsComponent } from './program-statistics.component';
import type { ProgramStatisticsProgram } from '../../../../models/user-program-statistics.model';

const program = (patch: Partial<ProgramStatisticsProgram>): ProgramStatisticsProgram => ({
  programId: 1, programName: 'P', totalWorkouts: 6, completedWorkouts: 3, incompleteWorkouts: 3, completed: false,
  weeklyVolumes: [], exerciseStatistics: [], startDate: null, endDate: null, status: null, ...patch,
});

describe('Program statistics status badge', () => {
  const component = Object.create(UserProgramStatisticsComponent.prototype) as UserProgramStatisticsComponent;

  it('shows the backend status: completed, finished (expired), upcoming, active', () => {
    expect(component.programStatusKey(program({ status: 'COMPLETED', completed: true }))).toBe('userProgramStatistics.completed');
    expect(component.programStatusKey(program({ status: 'FINISHED' }))).toBe('userProgramStatistics.finished');
    expect(component.programStatusKey(program({ status: 'UPCOMING' }))).toBe('userProgramStatistics.upcoming');
    expect(component.programStatusKey(program({ status: 'ACTIVE' }))).toBe('userProgramStatistics.inProgress');
    expect(component.programStatusClass(program({ status: 'FINISHED' }))).toContain('text-content-700');
  });

  it('falls back to the completed flag when an older backend sends no status', () => {
    expect(component.programStatusKey(program({ completed: true }))).toBe('userProgramStatistics.completed');
    expect(component.programStatusKey(program({ completed: false }))).toBe('userProgramStatistics.inProgress');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserProgramStatisticsService } from '../../../../services/user/user-program-statistics.service';

describe('Program statistics service keeps the status fields', () => {
  it('passes startDate, endDate and status through to the component model', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let mapped: ProgramStatisticsProgram | undefined;
    TestBed.inject(UserProgramStatisticsService).getProgramStatistics('hu').subscribe(r => (mapped = r.data?.programs[0]));
    http.expectOne(r => r.url.endsWith('/user/program-statistics')).flush({ success: true, message: null, data: {
      totalPrograms: 1, completedPrograms: 0, programs: [{
        programId: 9, programName: 'Beginner', totalWorkouts: 6, completedWorkouts: 3, incompleteWorkouts: 3, completed: false,
        weeklyVolumes: [], exerciseStatistics: [], startDate: '2026-09-01', endDate: '2026-09-18', status: 'FINISHED',
      }],
    } });
    expect(mapped?.status).toBe('FINISHED');
    expect(mapped?.startDate).toBe('2026-09-01');
    expect(mapped?.endDate).toBe('2026-09-18');
    http.verify();
  });
});
