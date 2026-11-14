import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';
import { UserProfilService } from '../../../../services/user/user-profile/user-profile.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { LanguageService } from '../../../../services/shared/language.service';

describe('User profile optional coach directory', () => {
  for (const directoryFails of [true, false]) {
    it(`loads and saves the profile when coach directory failure=${directoryFails}`, () => {
      TestBed.configureTestingModule({});
      const updateUser = jasmine.createSpy().and.returnValue(of({ success: true }));
      const component = new UserProfileComponent({
        getCoaches: () => directoryFails ? throwError(() => new Error('offline')) : of([{ id: 7, name: 'Coach' }]),
        getMemberById: () => of({ id: 42, usernameOrName: 'Alice', email: 'alice@example.test',
          roles: ['ROLE_USER'], extraFields: { coach_id: 7, weight: 60 } }),
        updateUser,
      } as unknown as UserProfilService, { detectChanges() {} } as ChangeDetectorRef,
      { getUserId: () => 42 } as AuthService, { language$: new BehaviorSubject('hu') } as unknown as LanguageService);
      component.ngOnInit();
      expect(component.selectedUser.id).toBe(42);
      expect(component.selectedUser.coachId).toBe(7);
      expect(component.coachesLoadFailed).toBe(directoryFails);
      expect(component.coachName).toBe(directoryFails ? '' : 'Coach');
      component.selectedUser.weight = 65;
      component.onSave();
      expect(updateUser).toHaveBeenCalledTimes(1);
      expect(updateUser.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
        id: 42, roles: ['ROLE_USER'], extraFields: jasmine.objectContaining({ coach_id: 7, weight: 65 }),
      }));
      component.ngOnDestroy();
    });
  }

  it('still reports failure when the profile itself is unavailable', () => {
    const component = new UserProfileComponent({
      getCoaches: () => of([]), getMemberById: () => throwError(() => new Error('offline')),
    } as unknown as UserProfilService, {} as ChangeDetectorRef,
    { getUserId: () => 42 } as AuthService, { language$: new BehaviorSubject('hu') } as unknown as LanguageService);
    component.ngOnInit();
    expect(component.message).toBe('userProfile.loadError');
    expect(component.selectedUser.id).toBe(0);
    component.ngOnDestroy();
  });
});
