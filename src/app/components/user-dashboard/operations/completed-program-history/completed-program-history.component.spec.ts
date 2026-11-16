import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { CompletedProgramHistoryService, CompletedProgram } from '../../../../services/user/completed-program-history.service';
import { UserExerciseDetailService } from '../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { CompletedProgramHistoryComponent } from './completed-program-history.component';

const ok = <T>(data: T): ApiResponse<T> => ({ success: true, message: null, data });

const program: CompletedProgram = {
  id: 29, name: 'Elvégzett edzésterv', description: null, startDate: '2026-10-13',
  endDate: '2026-11-16', durationDays: 35, totalWorkouts: 20, completedWorkouts: 20,
};

describe('Completed program history', () => {
  let component: CompletedProgramHistoryComponent;
  let programs: jasmine.SpyObj<CompletedProgramHistoryService>;
  let exercises: jasmine.SpyObj<UserExerciseDetailService>;

  beforeEach(() => {
    programs = jasmine.createSpyObj('CompletedProgramHistoryService', ['getCompletedPrograms', 'getWorkouts']);
    exercises = jasmine.createSpyObj('UserExerciseDetailService', ['getWorkoutExercises']);
    programs.getCompletedPrograms.and.returnValue(of(ok([program])));
    programs.getWorkouts.and.returnValue(of(ok([{
      userWorkoutId: 199, workoutId: 20, workoutName: 'Guggolás',
      workoutDate: '2026-10-13', performedAt: null, notes: null, feedback: null,
    }])));
    exercises.getWorkoutExercises.and.returnValue(of(ok({
      id: 20, name: 'Guggolás', description: '', exercises: [],
    })));
    TestBed.configureTestingModule({
      providers: [
        { provide: CompletedProgramHistoryService, useValue: programs },
        { provide: UserExerciseDetailService, useValue: exercises },
        { provide: LanguageService, useValue: { language$: new BehaviorSubject('hu') } },
      ],
    });
    // Isolate controller logic from the presentation/template in this contract test.
    TestBed.overrideComponent(CompletedProgramHistoryComponent, { set: { template: '' } });
    component = TestBed.createComponent(CompletedProgramHistoryComponent).componentInstance;
    component.ngOnInit();
  });

  it('loads and searches the separate historical list without changing active programs', () => {
    expect(component.visiblePrograms).toEqual([program]);
    expect(programs.getCompletedPrograms).toHaveBeenCalledWith('hu');
    component.search = 'más program';
    expect(component.visiblePrograms).toEqual([]);
  });

  it('drills into workouts and their sets using GET-only services', () => {
    component.selectProgram(program);
    expect(programs.getWorkouts).toHaveBeenCalledWith(29, 'hu');
    expect(component.workouts[0].workoutName).toBe('Guggolás');
    component.selectWorkout(component.workouts[0]);
    expect(exercises.getWorkoutExercises).toHaveBeenCalledWith(199, 'hu');
    expect(component.detail?.name).toBe('Guggolás');
    component.backToWorkouts();
    expect(component.detail).toBeNull();
  });
});
