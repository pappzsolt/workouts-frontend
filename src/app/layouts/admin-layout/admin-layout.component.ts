import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,          // ← fontos standalone komponensnél
  imports: [RouterModule],   // ← router-outlet működéséhez
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'] // ← plural és tömb
})
export class AdminLayoutComponent {}

