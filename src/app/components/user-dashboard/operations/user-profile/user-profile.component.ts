import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileService ,UserProfile} from "../../../../services/user/user-profile.service";

import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profile$!: Observable<UserProfile>;

  constructor(private profileService: UserProfileService) {}

  ngOnInit(): void {
    this.profile$ = this.profileService.getProfile();
  }
}
