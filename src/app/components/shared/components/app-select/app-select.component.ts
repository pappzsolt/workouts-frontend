import { registerValidationField } from '../form-controls/field-validation';
import { MessageComponent } from '../message/message.component';
import type { SelectOption, SelectValue } from '../../../../models/common/select-option.model';
import {
  Component,
  EventEmitter,
  ElementRef,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  booleanAttribute,
  inject,
  forwardRef,
  DestroyRef,
  ChangeDetectorRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  AbstractControl,
  ValidationErrors,
  Validator,
  Validators,
  FormsModule,
  NgModel,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { matchesSearch } from '../app-search/search-match';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-select',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppSelectComponent), multi: true },
  ],
  standalone: true,
  host: { '[attr.id]': 'null', '[class.searchable]': 'searchable' },
  imports: [FormsModule, TranslatePipe, MatAutocompleteModule, MatInputModule, MessageComponent],
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
})
export class AppSelectComponent<T extends SelectValue = string>
  implements OnChanges, OnDestroy, ControlValueAccessor, Validator
{
  @Input({ transform: booleanAttribute }) required = false;
  validationMessage = '';
  private interacted = false;
  private control?: AbstractControl;
  private validatorChanged = () => {};
  private static nextValidationId = 0;
  readonly validationId = `select-validation-${AppSelectComponent.nextValidationId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef, {
    optional: true,
    self: true,
  });
  private readonly unregister = this.host
    ? registerValidationField(this.host.nativeElement, this)
    : () => {};

  validate(control: AbstractControl): ValidationErrors | null {
    this.control = control;
    return this.isMissing(control.value) ? { required: true } : null;
  }
  registerOnValidatorChange(fn: () => void): void {
    this.validatorChanged = fn;
  }
  private isMissing(value: unknown): boolean {
    return (
      !this.isDisabled &&
      (this.required || !!this.control?.hasValidator(Validators.required)) &&
      (value == null || value === '' || value === this.placeholderValue)
    );
  }
  checkInput(): boolean {
    this.interacted = true;
    this.validationMessage = this.isMissing(this.control ? this.control.value : this.value)
      ? 'inputValidation.required'
      : '';
    this.cdr.markForCheck();
    return !this.validationMessage;
  }
  ngOnDestroy(): void {
    this.unregister();
  }

  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private formDisabled = false;
  private formBound = false;
  private propagateChange: (value: T) => void = () => {};
  private propagateTouched: () => void = () => {};

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      if (!this.searching) this.refreshSearchLabel();
      this.cdr.markForCheck();
    });
  }

  get isDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }
  writeValue(value: T | undefined): void {
    this.value = value;
    this.restoreSelection();
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (value: T) => void): void {
    this.formBound = true;
    this.propagateChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.formDisabled = disabled;
    this.cdr.markForCheck();
  }
  onBlur(): void {
    this.restoreSelection();
    this.propagateTouched();
    this.checkInput();
  }

  @Input() searchable = false;
  @Input() searchPlaceholder = '';
  private searching = false;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  searchTerm = '';
  searchValue: SelectValue = undefined;

  readonly displayOption = (value: SelectValue): string => {
    const option = this.options.find((option) => option.value === value);
    return option ? this.translate.instant(option.label) : '';
  };

  get filteredOptions(): SelectOption<T>[] {
    return this.options.filter((option) =>
      matchesSearch(this.searchTerm, this.translate.instant(option.label), option.searchText),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.validatorChanged();
    if (this.interacted) this.checkInput();
    if (changes['value'] || changes['searchable']) {
      this.restoreSelection();
    } else if (changes['options'] && !this.searching) {
      // Options can arrive after the selected ID. Update only the displayed label,
      // without emitting a selection or overwriting an in-progress search.
      this.refreshSearchLabel();
    }
  }

  onSearchInput(term: string): void {
    this.searching = true;
    this.searchTerm = term;
  }

  beginSearch(input: HTMLInputElement): void {
    this.searching = true;
    this.searchTerm = '';
    input.select();
  }

  restoreSelection(): void {
    this.searching = false;
    this.searchTerm = '';
    this.searchValue = this.value;
    this.refreshSearchLabel();
  }

  private refreshSearchLabel(): void {
    if (this.searchInput) {
      this.searchInput.nativeElement.value = this.displayOption(this.value);
    }
  }

  selectSearchOption(value: T): void {
    if (this.isDisabled) return;
    this.value = value;
    this.restoreSelection();
    this.onValueChange(value);
  }

  @Input() id = '';
  @Input() name = '';

  @Input() value: T | undefined = undefined;

  @Input() options: SelectOption<T>[] = [];

  @Input() placeholder = '';
  @Input() placeholderValue: T | '' = '';
  @Input() placeholderDisabled = false;
  @Input() disabled = false;

  @Input() className =
    'block min-h-11 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-content-400 disabled:opacity-80';

  @ViewChild(NgModel) private model?: NgModel;

  @Output() valueChange = new EventEmitter<T>();

  reset(value?: T): void {
    this.value = value;
    this.restoreSelection();
    this.model?.reset({ value, disabled: this.isDisabled });
  }

  onValueChange(value: T): void {
    if (this.isDisabled) return;
    if (this.formBound) this.value = value;
    this.propagateChange(value);
    this.valueChange.emit(value);
    this.interacted = true;
    this.validationMessage = this.isMissing(value) ? 'inputValidation.required' : '';
  }
}
