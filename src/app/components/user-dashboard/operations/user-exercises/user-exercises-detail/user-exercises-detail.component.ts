import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserExercisesDetailService, Exercise } from
    '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercises-detail.component.css']
})
export class UserExerciseDetailComponent implements OnInit {
  exercise$!: Observable<Exercise>;

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExercisesDetailService
  ) {}

  ngOnInit(): void {
    const exerciseId = Number(this.route.snapshot.paramMap.get('exerciseId'));
    this.exercise$ = this.exercisesService.getExerciseById(exerciseId);
  }
}
