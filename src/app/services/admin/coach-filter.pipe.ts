import { Pipe, PipeTransform } from '@angular/core';
import { Coach } from './coach-edit.service'; // vagy ahonnan az interfész jön

@Pipe({
  name: 'coachFilter',
  standalone: true, // nem kell külön module
})
export class CoachFilterPipe implements PipeTransform {
  transform(coaches: Coach[], search: string): Coach[] {
    if (!coaches) return [];
    if (!search) return coaches;
    search = search.toLowerCase();
    return coaches.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search)
    );
  }
}
