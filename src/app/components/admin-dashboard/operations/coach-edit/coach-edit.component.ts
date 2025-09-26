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
    password: '' // ⬅️ hozzáadva
  };

  constructor(private coachService: CoachEditService) {}

  ngOnInit() {
    // Betöltjük az összes edzőt a select boxhoz
    this.coachService.getCoaches().subscribe({
      next: (data) => {
        this.coaches = data;

        // Ha van legalább egy coach, beállíthatjuk alapértelmezettként
        if (this.coaches.length > 0) {
          this.selectedCoachId = this.coaches[0].id;
          this.onSelectCoach();
        }
      },
      error: (err) => console.error('Hiba az edzők betöltésekor', err)
    });
  }

  onSelectCoach() {
    const found = this.coaches.find(c => c.id === this.selectedCoachId);
    if (found) {
      // Form mezők frissítése a kiválasztott coach adataival
      this.selectedCoach = { ...found };
    } else {
      // Ha nincs kiválasztva, alapértelmezett üres objektum
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
      this.coachService.updateCoach(this.selectedCoachId, this.selectedCoach).subscribe({
        next: (data) => {
          console.log('Mentett edző:', data);
          alert('Edző adatai sikeresen frissítve!');
        },
        error: (err) => {
          console.error('Hiba az edző mentésekor', err);
          alert('Hiba történt a mentés során!');
        }
      });
    }
  }
}
