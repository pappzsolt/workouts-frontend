import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserNewEditService } from '../../../../services/admin/user-new-edit.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent implements OnInit {
  userId!: number;
  user = { name: '', email: '' };

  constructor(
    private route: ActivatedRoute,
    private userService: UserNewEditService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.userService.getUserById(this.userId).subscribe({
      next: (data) => (this.user = data),
      error: (err) => console.error(err)
    });
  }

  onSubmit() {
    this.userService.updateUser(this.userId, this.user).subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err) => console.error(err)
    });
  }
}
