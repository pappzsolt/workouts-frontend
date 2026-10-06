import { AppButtonComponent } from '../app-button/app-button.component';
import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BackNavigationService } from '../../../../services/shared/back-navigation.service';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [AppButtonComponent, TranslatePipe],
  templateUrl: './back-button.component.html',
})
export class BackButtonComponent {
  @Input() fallbackUrl = '/';
  @Input() targetUrl: string | null = null;
  @Input() targetState: Record<string, unknown> | undefined;
  @Input() label = 'common.back';

  constructor(private readonly backNavigationService: BackNavigationService) {}

  goBack(): void {
    if (this.targetUrl) {
      this.backNavigationService.navigateTo(this.targetUrl, this.targetState);
      return;
    }

    this.backNavigationService.back(this.fallbackUrl);
  }
}
