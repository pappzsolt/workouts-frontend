import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { MessageComponent } from './message/message.component';

export const SHARED_IMPORTS = [
  CommonModule,
  RouterModule,
  FormsModule,
  TranslatePipe,
  MessageComponent,
];
