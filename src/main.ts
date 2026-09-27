import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { LoggerService } from './app/services/logger.service';

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  // A root injector is not available when application bootstrap itself fails.
  // Use the same logging abstraction without hiding the bootstrap error.
  new LoggerService().error(err);
});
