import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachWorkoutsComponent } from './coach-workouts.component';

describe('CoachWorkoutsComponent', () => {
  let component: CoachWorkoutsComponent;
  let fixture: ComponentFixture<CoachWorkoutsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachWorkoutsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachWorkoutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
