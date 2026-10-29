import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { API_ENDPOINTS } from '../../../../api-endpoints';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { WorkoutListComponent } from './coach-workouts.component';
import { NewWorkoutComponent } from './coach-workout-new/new-workout.component';

describe('Workout model screen bindings', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkoutListComponent, NewWorkoutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService(),
        { provide: LanguageService, useValue: { language$: new BehaviorSubject('hu'), getCurrentLanguage: () => 'hu' } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows the canonical name on the card and in delete confirmation', () => {
    spyOn(TestBed.inject(CoachWorkoutsService), 'getWorkoutLibraryPage').and.returnValue(of({
      items: [{ id: 7, name: 'Template name', description: 'Description', exercises: [], durationMinutes: 30 }],
      totalElements: 1, totalPages: 1,
    }));
    const fixture = TestBed.createComponent(WorkoutListComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Template name');
    const deleteButton = [...element.querySelectorAll('button')]
      .find(button => button.textContent?.includes('userWorkoutExerciseManager.delete'))!;
    deleteButton.click();
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.directive(ConfirmDialogComponent)).componentInstance as ConfirmDialogComponent;
    expect(dialog.open).toBeTrue();
    expect(dialog.messageParams).toEqual({ name: 'Template name' });
    dialog.cancelled.emit();
    expect(fixture.componentInstance.pendingDeleteWorkoutId).toBeNull();
  });

  it('submits values entered through the new-workout form and opens the created workout', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(NewWorkoutComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === API_ENDPOINTS.myWorkouts).flush({ success: true, data: [] });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const enter = (selector: string, value: string) => {
      const input = element.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    enter('input[name="name"]', 'New template');
    enter('textarea[name="description"]', 'Description');
    enter('input[name="workoutDate"]', '2026-10-29');
    enter('input[name="durationMinutes"]', '45');
    fixture.detectChanges();
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne(req => req.url === API_ENDPOINTS.workoutAdd);
    expect(request.request.body).toEqual({
      id: null, name: 'New template', description: 'Description', workoutDate: '2026-10-29',
      durationMinutes: 45, intensityLevel: '', dayIndex: null, done: false,
    });
    request.flush({ success: true, data: { id: 8 } });
    expect(navigate).toHaveBeenCalledOnceWith(['/coach/workouts', 8, 'edit']);
  });
});
