import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

export interface Exercise {
  id?: number;
  name: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  muscle_group?: string;
  equipment?: string;
  difficulty_level?: string;
  category?: string;
  calories_burned_per_minute?: number;
  duration_seconds?: number;
}

@Component({
  selector: 'app-coach-exercise-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-exercise-edit.component.html',
  styleUrls: ['./coach-exercise-edit.component.css']
})
export class CoachExerciseEditComponent implements OnInit {
  exercise: Exercise = {
    name: '',
    description: '',
    image_url: '',
    video_url: '',
    muscle_group: '',
    equipment: '',
    difficulty_level: '',
    category: '',
    calories_burned_per_minute: 0,
    duration_seconds: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      // TODO: itt majd hívni kell a service-t a betöltéshez
      console.log('Load exercise with ID:', id);
    }
  }

  saveExercise() {
    // TODO: itt majd a service hívása a mentéshez
    console.log('Exercise saved:', this.exercise);
    this.router.navigate(['/coach/exercises']);
  }
}
