import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AppSelectComponent } from './app-select.component';
import type { SelectValue } from '../../../../models/common/select-option.model';

describe('AppSelectComponent value handling', () => {
  let fixture: ComponentFixture<AppSelectComponent<SelectValue>>;
  let select: HTMLSelectElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSelectComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
    fixture = TestBed.createComponent(AppSelectComponent<SelectValue>);
    fixture.detectChanges();
    select = fixture.nativeElement.querySelector('select');
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  for (const value of ['male', 42, false, true]) {
    it(`preserves the type of ${JSON.stringify(value)} on selection`, async () => {
      fixture.componentRef.setInput('options', [{ value, label: 'Option' }]);
      await render();
      const changed = jasmine.createSpy('changed');
      fixture.componentInstance.valueChange.subscribe(changed);
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
      expect(changed).toHaveBeenCalledOnceWith(value);
      if (typeof value === 'string') expect(select.value).toBe(value);
    });
  }

  for (const empty of [null, undefined, '']) {
    it(`preserves the ${String(empty)} placeholder value when cleared`, async () => {
      fixture.componentRef.setInput('options', [{ value: 42, label: 'Coach' }]);
      fixture.componentRef.setInput('placeholder', 'Choose');
      fixture.componentRef.setInput('placeholderValue', empty);
      fixture.componentRef.setInput('value', 42);
      await render();
      const changed = jasmine.createSpy('changed');
      fixture.componentInstance.valueChange.subscribe(changed);
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
      expect(changed).toHaveBeenCalledOnceWith(empty);
    });
  }

  it('selects a numeric input after options arrive and reflects an external reset', async () => {
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('placeholder', 'Choose');
    fixture.componentRef.setInput('placeholderValue', undefined);
    await render();
    fixture.componentRef.setInput('options', [{ value: 42, label: 'Coach' }]);
    await render();
    expect(select.selectedIndex).toBe(1);
    fixture.componentRef.setInput('value', undefined);
    await render();
    expect(select.selectedIndex).toBe(0);
  });

  it('applies disabled states and forwards the label target to the native select', async () => {
    fixture.componentRef.setInput('id', 'userSelect');
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('placeholder', 'Choose');
    fixture.componentRef.setInput('placeholderDisabled', true);
    await render();
    expect(select.disabled).toBeTrue();
    expect(select.options[0].disabled).toBeTrue();
    expect(select.id).toBe('userSelect');
    expect(fixture.nativeElement.getAttribute('id')).toBeNull();
    fixture.componentRef.setInput('disabled', false);
    await render();
    expect(select.disabled).toBeFalse();
  });
});
