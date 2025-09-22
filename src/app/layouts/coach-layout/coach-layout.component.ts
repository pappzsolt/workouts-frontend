import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CoachMenuComponent } from '../../components/dynamic-menu/coach-menu/coach-menu.component';

@Component({
  selector: 'app-coach-layout',
  standalone: true,
  imports: [RouterModule, CoachMenuComponent],
  templateUrl: './coach-layout.component.html',
  styleUrls: ['./coach-layout.component.css']
})
export class CoachLayoutComponent {}
