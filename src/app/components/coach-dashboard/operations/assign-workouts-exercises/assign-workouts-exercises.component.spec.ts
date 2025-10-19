import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignWorkoutsExercisesComponent } from './assign-workouts-exercises.component';

describe('AssignWorkoutsExercisesComponent', () => {
  let component: AssignWorkoutsExercisesComponent;
  let fixture: ComponentFixture<AssignWorkoutsExercisesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignWorkoutsExercisesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignWorkoutsExercisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
