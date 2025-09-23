import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachNewService } from '../../../../services/admin/coach-new.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-coach-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-new.component.html',
  styleUrls: ['./coach-new.component.css']
})
export class CoachNewComponent {
  coach = { name: '', description: '', duration: '' };

  constructor(private coachService: CoachNewService, private router: Router) {}

  onSubmit() {
    this.coachService.createCoach(this.coach).subscribe({
      next: () => this.router.navigate(['/coach']),
      error: (err) => console.error(err)
    });
  }
}
