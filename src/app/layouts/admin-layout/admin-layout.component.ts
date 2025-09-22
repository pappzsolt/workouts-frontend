import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminMenuComponent } from '../../components/dynamic-menu/admin-menu/admin-menu.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, AdminMenuComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {}
