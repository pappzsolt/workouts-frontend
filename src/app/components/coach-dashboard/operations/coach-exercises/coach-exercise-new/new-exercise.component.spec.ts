import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { NewExerciseComponent } from './new-exercise.component';
import { ExerciseService } from '../../../../../services/coach/coach-exercises/coach-exercises.service';
import { LoggerService } from '../../../../../services/logger.service';

describe('New exercise supported fields', () => {
  it('renders editable exercise fields without an unsupported Done checkbox', async () => {
    const add = jasmine.createSpy().and.returnValue(of({ success: true, data: null, message: null }));
    TestBed.configureTestingModule({ imports: [NewExerciseComponent], providers: [
      provideTranslateService(), { provide: ExerciseService, useValue: { addExercise: add } },
      { provide: LoggerService, useValue: { error() {} } },
    ] });
    const fixture = TestBed.createComponent(NewExerciseComponent);
    fixture.componentRef.setInput('workoutId', 1);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[name="done"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="text"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
    fixture.componentInstance.newExercise.name = 'Squat';
    fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.addExercise();
    expect(add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ name: 'Squat' }));
    fixture.destroy();
  });
});
