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
  inject,
} from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { matchesSearch } from '../app-search/search-match';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-select',
  standalone: true,
  host: { '[attr.id]': 'null', '[class.searchable]': 'searchable' },
  imports: [FormsModule, TranslatePipe, MatAutocompleteModule, MatInputModule],
  templateUrl: './app-select.component.html',
  styleUrl: './app-select.component.css',
})
export class AppSelectComponent<T extends SelectValue = string> implements OnChanges {
  private readonly translate = inject(TranslateService);

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
    this.model?.reset({ value, disabled: this.disabled });
  }

  onValueChange(value: T): void {
    this.valueChange.emit(value);
  }
}
