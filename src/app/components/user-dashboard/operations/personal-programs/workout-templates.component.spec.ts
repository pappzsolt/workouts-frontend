import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { WorkoutTemplatesComponent } from './workout-templates.component';
import { PersonalProgramService } from '../../../../services/user/personal-program.service';
import { WorkoutTemplate } from '../../../../models/workout-template.model';

const template = (id = 1, favorite = false): WorkoutTemplate => ({
  id,
  sourceProgramId: 7,
  favorite,
  createdAt: '2026-10-25T10:00:00Z',
  program: {
    name: `Sablon ${id}`,
    description: null,
    durationDays: 1,
    startDate: null,
    difficultyLevel: null,
    languageCode: 'hu',
    workouts: [
      {
        dayIndex: 1,
        name: 'Nap',
        description: null,
        exercises: [{ exerciseId: 1, sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
      },
    ],
  },
});

describe('Workout template library', () => {
  let component: WorkoutTemplatesComponent;
  let api: jasmine.SpyObj<PersonalProgramService>;
  let router: jasmine.SpyObj<Router>;
  beforeEach(() => {
    api = jasmine.createSpyObj('PersonalProgramService', [
      'listTemplates',
      'favoriteTemplate',
      'useTemplate',
      'deleteTemplate',
    ]);
    api.listTemplates.and.returnValue(of([template(1), template(2, true)]));
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: PersonalProgramService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new WorkoutTemplatesComponent());
    component.ngOnInit();
  });
  it('filters favorites and combines the filter with search', () => {
    expect(component.filtered.map((t) => t.id)).toEqual([2, 1]);
    component.favoritesOnly = true;
    expect(component.filtered.map((t) => t.id)).toEqual([2]);
    component.search = 'Sablon 1';
    expect(component.filtered).toEqual([]);
  });
  it('keeps the favorite value unchanged until the server confirms it', () => {
    const pending = new Subject<WorkoutTemplate>();
    api.favoriteTemplate.and.returnValue(pending);
    component.favorite(component.templates[0]);
    component.favorite(component.templates[0]);
    expect(api.favoriteTemplate).toHaveBeenCalledOnceWith(1, true);
    expect(component.templates[0].favorite).toBeFalse();
    pending.error(new Error('Failed'));
    expect(component.templates[0].favorite).toBeFalse();
    expect(component.busy).toBeFalse();
  });
  it('opens a fresh draft and prevents duplicate occasions while the request is pending', () => {
    const pending = new Subject<any>();
    api.useTemplate.and.returnValue(pending);
    component.use(component.templates[0]);
    component.use(component.templates[0]);
    expect(api.useTemplate).toHaveBeenCalledOnceWith(1);
    pending.next({ id: 55 });
    pending.complete();
    expect(router.navigate).toHaveBeenCalledWith(['/user/personal-workouts', 55]);
  });
  it('preserves the library when creating an occasion fails and allows retry', () => {
    api.useTemplate.and.returnValue(throwError(() => new Error('Unavailable')));
    component.use(component.templates[0]);
    expect(component.templates.length).toBe(2);
    expect(component.busy).toBeFalse();
    expect(component.message).toBe('Unavailable');
  });
  it('deletes only after confirmation and preserves other templates', () => {
    component.confirmDelete();
    expect(api.deleteTemplate).not.toHaveBeenCalled();
    component.pendingDelete = component.templates[0];
    api.deleteTemplate.and.returnValue(of(1));
    component.confirmDelete();
    expect(component.templates.map((t) => t.id)).toEqual([2]);
    expect(component.pendingDelete).toBeNull();
  });
});
