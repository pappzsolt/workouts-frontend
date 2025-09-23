import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserExercisesDetailService, Exercise } from
    '../../../../../services/user/user-exercises-detail/user-exercises-detail.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-user-exercise-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-exercises-detail.component.html',
  styleUrls: ['./user-exercise-detail.component.css']
})
export class UserExerciseDetailComponent implements OnInit {
  exercise$!: Observable<Exercise | undefined>;

  constructor(
    private route: ActivatedRoute,
    private exercisesService: UserExercisesDetailService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // service-ből az összeset lekéri, majd kiszűri a kiválasztottat
    this.exercise$ = this.exercisesService.getExercisesByWorkout(1).pipe(
      map(exercises => exercises.find(e => e.id === id))
    );
  }
}
