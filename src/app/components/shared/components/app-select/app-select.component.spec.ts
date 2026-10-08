import { ANIMATION_MODULE_TYPE } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AppSelectComponent } from './app-select.component';
import { RoleSelectComponent } from '../../roles/role-select.component';
import { RoleService } from '../../../../services/roles/role.service';

describe('AppSelect typed selection and role integration', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppSelectComponent, RoleSelectComponent],
      providers: [
        { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
        provideTranslateService(),
        { provide: RoleService, useValue: {} },
      ],
    }),
  );


  it('shows a MessageComponent for a required placeholder and clears it after a valid selection', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number>);
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('options', [{ value: 7, label: 'User' }]);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.checkInput()).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('inputValidation.required');
    fixture.componentRef.setInput('value', 7);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.checkInput()).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-message')).toBeNull();
  });
  it('emits boolean false rather than the string false', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<boolean>);
    fixture.componentRef.setInput('options', [
      { value: false, label: 'No' },
      { value: true, label: 'Yes' },
    ]);
    fixture.componentRef.setInput('value', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.valueChange.subscribe(changed);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledOnceWith(false);
  });

  it('preserves the numeric ID and null placeholder values', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number | null>);
    fixture.componentRef.setInput('options', [{ value: 7, label: 'User' }]);
    fixture.componentRef.setInput('placeholder', 'Select user');
    fixture.componentRef.setInput('placeholderValue', null);
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    await fixture.whenStable();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.valueChange.subscribe(changed);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));
    expect(changed.calls.allArgs()).toEqual([[7], [null]]);
  });

  it('emits the role object by ID and resets to the placeholder after each selection', async () => {
    const fixture = TestBed.createComponent(RoleSelectComponent);
    const role = { id: 7, name: 'COACH' };
    fixture.componentRef.setInput('roles', [role]);
    fixture.detectChanges();
    await fixture.whenStable();
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.roleSelected.subscribe(selected);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    for (let attempt = 0; attempt < 2; attempt++) {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(select.selectedIndex).toBe(0);
    }
    expect(selected.calls.allArgs()).toEqual([[role], [role]]);
  });
});

describe('AppSelect searchable mode', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppSelectComponent],
      providers: [
        provideTranslateService(),
        { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
      ],
    }),
  );

  it('filters while typing without selecting, then selects a numeric ID using the keyboard', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number>);
    fixture.componentRef.setInput('searchable', true);
    fixture.componentRef.setInput('options', [
      { value: 7, label: 'Anna' },
      { value: 8, label: 'Béla' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.valueChange.subscribe(changed);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.focus();
    input.value = 'bé';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.filteredOptions.map((option) => option.value)).toEqual([8]);
    expect(changed).not.toHaveBeenCalled();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledOnceWith(8);
    expect(input.value).toBe('Béla');
    fixture.destroy();
  });

  it('shows no results and restores the selected label when an unfinished search loses focus', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number>);
    fixture.componentRef.setInput('searchable', true);
    fixture.componentRef.setInput('options', [{ value: 7, label: 'Anna' }]);
    fixture.componentRef.setInput('value', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.valueChange.subscribe(changed);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.focus();
    input.value = 'missing';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('mat-option')?.textContent).toContain('appSearch.noResults');
    input.blur();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.value).toBe('Anna');
    expect(changed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('shows the selected label when options arrive later without emitting a new selection', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number>);
    fixture.componentRef.setInput('searchable', true);
    fixture.componentRef.setInput('value', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.valueChange.subscribe(changed);
    fixture.componentRef.setInput('options', [{ value: 7, label: 'Anna' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input').value).toBe('Anna');
    expect(changed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('preserves an unfinished search when options refresh, including an empty query', async () => {
    const fixture = TestBed.createComponent(AppSelectComponent<number>);
    fixture.componentRef.setInput('searchable', true);
    fixture.componentRef.setInput('value', 7);
    fixture.componentRef.setInput('options', [{ value: 7, label: 'Anna' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.focus();
    for (const query of ['other', '']) {
      input.value = query;
      input.dispatchEvent(new Event('input'));
      fixture.componentRef.setInput('options', [{ value: 7, label: 'Anna updated' }]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input.value).toBe(query);
      expect(fixture.componentInstance.value).toBe(7);
    }
    input.blur();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.value).toBe('Anna updated');
    fixture.destroy();
  });
});
