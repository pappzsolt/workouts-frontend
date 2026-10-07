import { AppInputDirective } from './components/form-controls/app-input.directive';
import { AppTextareaDirective } from './components/form-controls/app-textarea.directive';
import {
  AppCheckboxDirective,
  AppRadioDirective,
} from './components/form-controls/app-check.directive';
import { AppDialogComponent } from './components/app-dialog/app-dialog.component';
import { AppBadgeComponent } from './components/app-badge/app-badge.component';
import {
  AppPageHeaderComponent,
  AppSectionHeaderComponent,
  AppHeadingDirective,
} from './components/app-page-header/app-page-header.component';
import {
  AppLoadingComponent,
  AppEmptyStateComponent,
} from './components/app-state/app-state.component';
import { AppTabsComponent, AppTabDirective } from './components/app-tabs/app-tabs.component';
import {
  AppTableDirective,
  AppTableHeaderDirective,
  AppTableCellDirective,
} from './components/app-table/app-table.directive';
import { ProfileFieldsComponent } from './components/profile-fields/profile-fields.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { MessageComponent } from './components/message/message.component';
import { PaginationComponent } from '../../components/shared/components/pagination/pagination.component';
import { BackButtonComponent } from '../shared/components/back-button/back-button.component';
import { AppButtonComponent } from '../../components/shared/components/app-button/app-button.component';
import { AppCardComponent } from '../../components/shared/components/app-card/app-card.component';
import { FormFieldComponent } from './components/form-field/form-field.component';
import { AppIconComponent } from './components/app-icon/app-icon.component';

export const SHARED_IMPORTS = [
  AppInputDirective,
  AppTextareaDirective,
  AppCheckboxDirective,
  AppRadioDirective,
  AppDialogComponent,
  AppBadgeComponent,
  AppHeadingDirective,
  AppPageHeaderComponent,
  AppSectionHeaderComponent,
  AppLoadingComponent,
  AppEmptyStateComponent,
  AppTabsComponent,
  AppTabDirective,
  AppTableDirective,
  AppTableHeaderDirective,
  AppTableCellDirective,
  ProfileFieldsComponent,
  CommonModule,
  RouterModule,
  FormsModule,
  TranslatePipe,
  MessageComponent,
  ConfirmDialogComponent,
  BackButtonComponent,
  PaginationComponent,
  AppButtonComponent,
  AppCardComponent,
  FormFieldComponent,
  AppIconComponent,
];
