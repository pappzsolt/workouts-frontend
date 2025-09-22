import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachTrainingComponent } from './coach-training.component';

describe('CoachTrainingComponent', () => {
  let component: CoachTrainingComponent;
  let fixture: ComponentFixture<CoachTrainingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachTrainingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachTrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
