import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserMyProgramsComponent } from './user-my-programs.component';

describe('UserMyProgramsComponent', () => {
  let component: UserMyProgramsComponent;
  let fixture: ComponentFixture<UserMyProgramsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMyProgramsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserMyProgramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
