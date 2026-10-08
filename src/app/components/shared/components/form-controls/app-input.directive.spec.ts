import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AppInputDirective, createInputValidationGuard } from './app-input.directive';
import { AppTextareaDirective } from './app-textarea.directive';
import { AppFormValidationDirective } from './app-form-validation.directive';
import { isValidDate } from './field-validation';

@Component({
  standalone: true,
  imports: [FormsModule, AppInputDirective, AppTextareaDirective, AppFormValidationDirective],
  template: `
    <form (ngSubmit)="submissions = submissions + 1">
      <input appInput name="age" type="number" min="0" step="1" [(ngModel)]="age" />
      <input appInput name="weight" type="number" min="0" step="0.01" [(ngModel)]="weight" />
      <input appInput name="email" type="email" [(ngModel)]="email" />
      <input appInput name="text" type="text" [(ngModel)]="text" />
      <input appInput name="date" type="date" [(ngModel)]="date" />
      <input appInput name="phone" type="text" appValidation="phone" [(ngModel)]="phone" />
      <input
        appInput
        name="password"
        type="password"
        appValidation="password"
        [(ngModel)]="password"
      />
      <input
        appInput
        name="confirmation"
        type="password"
        appValidation="password"
        [appMatchValue]="password"
        [(ngModel)]="confirmation"
      />
      <textarea appTextarea name="notes" [(ngModel)]="notes"></textarea>
    </form>
  `,
})
class InputHost {
  readonly validateInputs = createInputValidationGuard();
  age: number | null = 30;
  weight: number | null = 75.25;
  email = 'user@example.com';
  text = '';
  date = '';
  phone = '';
  password = '';
  confirmation = '';
  notes = '';
  submissions = 0;
  saves = 0;
  save(): void {
    if (!this.validateInputs()) return;
    this.saves++;
  }
}

describe('Input type validation and MessageComponent feedback', () => {
  let fixture: ComponentFixture<InputHost>;
  const input = (name: string): HTMLInputElement =>
    fixture.nativeElement.querySelector(`[name="${name}"]`);
  const edit = (name: string, value: string): void => {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [InputHost],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('hu', {
      inputValidation: {
        number: 'Csak szám adható meg.',
        integer: 'Csak egész szám adható meg.',
        email: 'Érvényes email-címet adj meg.',
        min: 'Legalább {{min}} legyen.',
        step: '{{step}} lépésköz.',
        required: 'Kötelező mező.',
        date: 'Érvényes dátumot adj meg.',
        phone: 'Hibás telefonszám.',
        minLength: 'Legalább {{min}} karakter.',
        maxLength: 'Legfeljebb {{max}} karakter.',
        passwordMismatch: 'Eltérő jelszavak.',
      },
    });
    translate.use('hu');
    fixture = TestBed.createComponent(InputHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('rejects letters and exponent characters in age with a MessageComponent error', () => {
    for (const key of ['a', 'e']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      input('age').dispatchEvent(event);
      expect(event.defaultPrevented).toBeTrue();
    }
    expect(input('age').value).toBe('30');
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Csak szám');
    expect(input('age').getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects nonnumeric pasted text without changing the value', () => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'abc123' } });
    input('age').dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(input('age').value).toBe('30');
    expect(fixture.nativeElement.querySelector('app-message').textContent).toContain('Csak szám');
  });

  it('blocks fractional age and negative weight on save, then allows corrected values', () => {
    edit('age', '20.5');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Csak egész szám');
    edit('age', '20');
    edit('weight', '-1');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    edit('weight', '72.35');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    expect(input('age').hasAttribute('aria-invalid')).toBeFalse();
    expect(input('weight').hasAttribute('aria-invalid')).toBeFalse();
  });

  it('blocks malformed email and clears its MessageComponent after correction', () => {
    edit('email', 'wrong@');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Érvényes email');
    edit('email', 'correct@example.com');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Érvényes email');
  });

  it('preserves arbitrary text and empty optional numeric fields', () => {
    edit('text', 'Árvíztűrő 123 ! @ és egyéb szöveg');
    edit('age', '');
    edit('weight', '');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    expect(fixture.componentInstance.text).toBe('Árvíztűrő 123 ! @ és egyéb szöveg');
    expect(fixture.componentInstance.age).toBeNull();
    expect(fixture.nativeElement.querySelector('app-message')).toBeNull();
  });
  it('blocks empty required fields on submit before ngSubmit is emitted', () => {
    input('text').required = true;
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.submissions).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Kötelező mező');
    edit('text', 'Kitöltve');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(fixture.componentInstance.submissions).toBe(1);
  });

  it('checks required and length constraints for textareas in the same save guard', () => {
    const notes: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    notes.required = true;
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    notes.minLength = 3;
    notes.value = 'ab';
    notes.dispatchEvent(new Event('input'));
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    notes.value = 'abc';
    notes.dispatchEvent(new Event('input'));
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
  });

  it('rejects an impossible date held in the model and accepts a real leap day', async () => {
    fixture.componentInstance.date = '2026-02-30';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Érvényes dátumot');
    edit('date', '2028-02-29');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
  });

  it('validates optional phone numbers when provided, using the same +36 format', () => {
    edit('phone', 'telefon');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Hibás telefonszám');
    edit('phone', '+36301234567');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    edit('phone', '');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(2);
  });

  it('uses 8–72 characters for new passwords and revalidates confirmation when the password changes', () => {
    edit('password', 'short');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    edit('password', 'validpass1');
    edit('confirmation', 'validpass2');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Eltérő jelszavak');
    edit('confirmation', 'validpass1');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    edit('password', 'newvalidpass');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    edit('password', 'x'.repeat(73));
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Legfeljebb 72');
  });

  it('normalizes pasted decimal commas through the native number accessor', () => {
    const element = input('weight');
    element.focus();
    element.select();
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '72,5' } });
    element.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBeTrue();
    expect(element.type).toBe('number');
    expect(fixture.componentInstance.weight).toBe(72.5);
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
  });

  it('rejects decimal commas in whole number fields with the integer message', () => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '20,5' } });
    input('age').dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.age).toBe(30);
    expect(fixture.nativeElement.textContent).toContain('Csak egész szám');
  });

  it('preserves existing aria descriptions while adding and removing the error', () => {
    input('email').setAttribute('aria-describedby', 'existing-hint');
    edit('email', 'bad@');
    expect(input('email').getAttribute('aria-describedby')).toContain('existing-hint');
    edit('email', 'valid@example.com');
    expect(input('email').getAttribute('aria-describedby')).toBe('existing-hint');
  });
  it('rejects scientific notation inserted by autofill as well as typing and paste', () => {
    edit('age', '1e2');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Csak szám');
  });

  it('accepts a typed decimal comma without replacing the native number input', () => {
    edit('weight', '72');
    const element = input('weight');
    element.focus();
    const comma = new KeyboardEvent('keydown', { key: ',', bubbles: true, cancelable: true });
    element.dispatchEvent(comma);
    expect(comma.defaultPrevented).toBeTrue();
    element.ownerDocument.execCommand('insertText', false, '5');
    expect(element.type).toBe('number');
    expect(fixture.componentInstance.weight).toBe(72.5);
  });

  it('enforces the declared decimal step while tolerating floating point arithmetic', () => {
    edit('weight', '72.351');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('0.01 lépésköz');
    edit('weight', '72.35');
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
  });

  it('ignores disabled and readonly fields while preserving optional blank passwords', () => {
    edit('phone', 'bad');
    input('phone').disabled = true;
    edit('date', '');
    input('date').required = true;
    input('date').readOnly = true;
    fixture.componentInstance.save();
    expect(fixture.componentInstance.saves).toBe(1);
  });

  it('clears a field error when a different valid model value is loaded', async () => {
    edit('email', 'bad@');
    fixture.componentInstance.email = 'loaded@example.com';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Érvényes email');
  });
});

describe('Calendar validation', () => {
  it('checks actual calendar dates rather than only their shape', () => {
    expect(isValidDate('2024-02-29')).toBeTrue();
    for (const value of [
      '2025-02-29',
      '1900-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-00-01',
      '0000-01-01',
      '2026-10-',
      'text',
    ]) {
      expect(isValidDate(value)).withContext(value).toBeFalse();
    }
    expect(isValidDate('2000-02-29')).toBeTrue();
  });
  it('checks datetime-local hours, minutes and seconds', () => {
    expect(isValidDate('2026-10-08T18:30', true)).toBeTrue();
    expect(isValidDate('2026-10-08T18:30:15.123', true)).toBeTrue();
    for (const value of [
      '2026-10-08',
      '2026-10-08T24:00',
      '2026-10-08T18:60',
      '2026-10-08T18:30:60',
    ]) {
      expect(isValidDate(value, true)).withContext(value).toBeFalse();
    }
  });
});
