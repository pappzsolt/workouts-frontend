import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMyProgramsService ,Program} from '../../../../services/user/user-my-programs.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css']
})
export class UserMyProgramsComponent implements OnInit {
  programs$!: Observable<Program[]>;

  constructor(private programsService: UserMyProgramsService) {}

  ngOnInit(): void {
    this.programs$ = this.programsService.getPrograms();
  }
}
