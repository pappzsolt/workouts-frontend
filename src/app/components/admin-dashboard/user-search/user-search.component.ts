import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSearchService } from '../../../services/user/user-search.service';

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.css']
})
export class UserSearchComponent {
  query = '';
  results: any[] = [];

  constructor(private userSearchService: UserSearchService) {}

  onSearch() {
    if (!this.query.trim()) return;

    this.userSearchService.searchUsers(this.query).subscribe({
      next: (data) => (this.results = data),
      error: (err) => console.error(err)
    });
  }
}
