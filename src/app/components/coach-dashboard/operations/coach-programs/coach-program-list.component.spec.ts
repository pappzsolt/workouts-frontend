import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachProgramListComponent } from './coach-program-list.component';

describe('CoachProgramListComponent', () => {
  let component: CoachProgramListComponent;
  let fixture: ComponentFixture<CoachProgramListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachProgramListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachProgramListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
