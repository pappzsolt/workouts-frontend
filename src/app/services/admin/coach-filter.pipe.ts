import { Pipe, PipeTransform } from '@angular/core';
import { Coach } from '../../models/coach.model';

@Pipe({
  name: 'coachFilter',
  standalone: true
})
export class CoachFilterPipe implements PipeTransform {

  transform(
    coaches: Coach[],
    search: string
  ): Coach[] {

    if (!coaches) {
      return [];
    }

    if (!search || !search.trim()) {
      return coaches;
    }

    const searchTerm = search
      .toLowerCase()
      .trim();

    return coaches.filter(coach =>
      coach.name.toLowerCase().includes(searchTerm) ||
      coach.email.toLowerCase().includes(searchTerm)
    );
  }
}
