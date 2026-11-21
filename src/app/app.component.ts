import { Component, inject } from '@angular/core';
import { SeoService } from './services/shared/seo.service';

import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { APP_VERSION } from './config/app-version';
import { BackNavigationService } from './services/shared/back-navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly currentYear = new Date().getFullYear();
  readonly appVersion = APP_VERSION;
  private readonly seo = inject(SeoService);
  constructor(private backNavigationService: BackNavigationService) {}
}
