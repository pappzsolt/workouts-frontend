import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachNewProgramComponent } from './coach-new-program.component';

describe('CoachNewProgramComponent', () => {
  let component: CoachNewProgramComponent;
  let fixture: ComponentFixture<CoachNewProgramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachNewProgramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachNewProgramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
