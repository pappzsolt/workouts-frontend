import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachNewWorkoutComponent } from './coach-new-workout.component';

describe('CoachNewWorkoutComponent', () => {
  let component: CoachNewWorkoutComponent;
  let fixture: ComponentFixture<CoachNewWorkoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachNewWorkoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachNewWorkoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
