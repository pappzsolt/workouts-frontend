import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './app-search.component.html',
  styleUrl: './app-search.component.css',
})
export class AppSearchComponent {
  @Input() searchTerm = '';

  @Input() label = 'coachPrograms.search';

  @Input() placeholder = 'coachPrograms.searchPlaceholder';

  @Input() inputId = 'appSearch';

  @Output() searchTermChange = new EventEmitter<string>();

  onSearchChange(value: string): void {
    this.searchTermChange.emit(value);
  }
}
