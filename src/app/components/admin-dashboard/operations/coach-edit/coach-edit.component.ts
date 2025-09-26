import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Coach, CoachEditService } from '../../../../services/admin/coach-edit.service';

@Component({
  selector: 'app-coach-edit',
  standalone: true,
  templateUrl: './coach-edit.component.html',
  styleUrls: ['./coach-edit.component.css'],
  imports: [CommonModule, FormsModule],
  providers: [CoachEditService]
})
export class CoachEditComponent implements OnInit {
  selectedCoachId: number | null = null;
  coaches: Coach[] = [];
  selectedCoach: Coach = {
    id: 0,
    name: '',
    email: '',
    phone: '',
    specialization: '',
    avatarUrl: '',
    password: ''
  };

  // Hibák/üzenetek a template-ben való megjelenítéshez
  message: string = '';
  error: string = '';
  loading: boolean = false;

  constructor(private coachService: CoachEditService) {}

  ngOnInit() {
    this.loadCoaches();
  }

  loadCoaches() {
    this.loading = true;
    this.message = '';
    this.error = '';
    this.coachService.getCoaches().subscribe({
      next: (data) => {
        this.coaches = data;
        this.loading = false;
        this.message = 'Edzők betöltve.';
        if (this.coaches.length > 0) {
          this.selectedCoachId = this.coaches[0].id;
          this.onSelectCoach();
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Hiba az edzők betöltésekor', err);
        this.error = 'Hiba történt az edzők betöltésekor!';
      }
    });
  }

  onSelectCoach() {
    const found = this.coaches.find(c => c.id === this.selectedCoachId);
    if (found) {
      this.selectedCoach = { ...found, password: '' };
    } else {
      this.selectedCoach = {
        id: 0,
        name: '',
        email: '',
        phone: '',
        specialization: '',
        avatarUrl: '',
        password: ''
      };
    }
  }

  onSave() {
    if (this.selectedCoachId !== null) {
      this.loading = true;
      this.message = '';
      this.error = '';

      this.selectedCoach.id = this.selectedCoachId;

      this.coachService.updateCoach(this.selectedCoachId, this.selectedCoach).subscribe({
        next: (data) => {
          this.loading = false;
          this.message = 'Edző adatai sikeresen frissítve!';

          // Lokális lista frissítése
          const index = this.coaches.findIndex(c => c.id === this.selectedCoachId);
          if (index !== -1) {
            this.coaches[index] = { ...data, password: '' };
          }
        },
        error: (err: any) => {
          this.loading = false;
          console.error('Hiba az edző mentésekor', err);
          this.error = 'Hiba történt az edző mentése során!';
        }
      });
    }
  }
}
