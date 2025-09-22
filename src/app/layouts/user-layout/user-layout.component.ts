import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserMenuComponent } from '../../components/dynamic-menu/user-menu/user-menu.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterModule, UserMenuComponent],
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css']
})
export class UserLayoutComponent {}
