import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachNewComponent } from './coach-new.component';

describe('CoachNewComponent', () => {
  let component: CoachNewComponent;
  let fixture: ComponentFixture<CoachNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
