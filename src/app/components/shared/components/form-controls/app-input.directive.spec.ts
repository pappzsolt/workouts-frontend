import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AppInputDirective, createInputValidationGuard } from './app-input.directive';

@Component({
  standalone: true,
  imports: [FormsModule, AppInputDirective],
  template: `
    <input appInput name="age" type="number" min="0" step="1" [(ngModel)]="age" />
    <input appInput name="weight" type="number" min="0" step="0.01" [(ngModel)]="weight" />
    <input appInput name="email" type="email" [(ngModel)]="email" />
    <input appInput name="text" type="text" [(ngModel)]="text" />
  `,
})
class InputHost {
  readonly validateInputs = createInputValidationGuard();
  age: number | null = 30;
  weight: number | null = 75.25;
  email = 'user@example.com';
  text = '';
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
});
