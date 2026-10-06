import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CoachEditService } from '../../../../services/admin/coach-edit.service';
import { Coach } from '../../../../models/coach.model';

import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import type { SelectOption } from '../../../../models/common/select-option.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-coach-edit',
  standalone: true,
  templateUrl: './coach-edit.component.html',
  styleUrls: ['./coach-edit.component.css'],
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  providers: [CoachEditService],
})
export class CoachEditComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  selectedCoachId: number | null = null;

  coaches: Coach[] = [];

  get coachOptions(): SelectOption<number>[] {
    return this.coaches.map((coach) => ({
      value: coach.id,
      label: `${coach.name} (${coach.email})`,
    }));
  }

  selectedCoach: Coach = {
    id: 0,
    name: '',
    email: '',
    phone: '',
    specialization: '',
    avatarUrl: '',
    password: '',
  };

  message = '';

  messageType: 'success' | 'error' | '' = '';

  loading = false;
  saving = false;
  private selectionVersion = 0;

  // =========================================================
  // Constructor
  // =========================================================

  constructor(private readonly coachService: CoachEditService) {}

  // =========================================================
  // Angular lifecycle
  // =========================================================

  ngOnInit(): void {
    this.loadCoaches();
  }

  // =========================================================
  // Edzők betöltése
  // =========================================================

  loadCoaches(): void {
    this.loading = true;

    this.message = '';
    this.messageType = '';

    this.coachService.getCoaches().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (coaches) => {
        this.coaches = coaches;

        this.loading = false;

        if (this.coaches.length > 0) {
          this.selectedCoachId = this.coaches[0].id;

          this.onSelectCoach();
        }
      },

      error: (err) => {
        this.loading = false;

        this.message = err?.error?.message || err?.message || 'adminCoachEdit.loadError';

        this.messageType = 'error';
      },
    });
  }

  // =========================================================
  // Edző kiválasztása
  // =========================================================

  onSelectCoach(): void {
    this.selectionVersion++;
    const found = this.coaches.find((coach) => coach.id === this.selectedCoachId);

    if (found) {
      this.selectedCoach = {
        ...found,
        password: '',
      };

      this.message = '';
      this.messageType = '';

      return;
    }

    this.resetSelectedCoach();
  }

  // =========================================================
  // Edző mentése
  // =========================================================

  onSave(): void {
    if (this.saving) return;
    if (this.selectedCoachId === null) {
      this.message = 'adminCoachEdit.noCoachSelected';

      this.messageType = 'error';

      return;
    }

    this.loading = true;

    this.message = '';
    this.messageType = '';

    const coachId = this.selectedCoachId;
    const version = this.selectionVersion;
    const payload = { ...this.selectedCoach, id: coachId };
    this.saving = true;

    this.coachService.updateCoach(coachId, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.loading = false; this.saving = false; }),
    ).subscribe({
      next: (updatedCoach) => {
        const index = this.coaches.findIndex((coach) => coach.id === coachId);
        if (index !== -1) this.coaches[index] = { ...updatedCoach, password: '' };
        if (this.selectedCoachId !== coachId || this.selectionVersion !== version) return;
        this.selectedCoach = { ...updatedCoach, password: '' };
        this.message = 'adminCoachEdit.updateSuccess';
        this.messageType = 'success';
      },

      error: (err) => {
        if (this.selectedCoachId !== coachId || this.selectionVersion !== version) return;
        this.message = err?.error?.message || err?.message || 'adminCoachEdit.saveError';

        this.messageType = 'error';
      },
    });
  }

  // =========================================================
  // Kiválasztott edző alaphelyzetbe állítása
  // =========================================================

  private resetSelectedCoach(): void {
    this.selectedCoach = {
      id: 0,
      name: '',
      email: '',
      phone: '',
      specialization: '',
      avatarUrl: '',
      password: '',
    };
  }


}
