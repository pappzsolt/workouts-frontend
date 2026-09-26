import { Component, Input, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-message',
  standalone: true,
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css'],
})
export class MessageComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private rawMessage = '';
  translatedMessage = '';

  @Input()
  set message(value: string) {
    this.rawMessage = value ?? '';
    this.translateMessage();
  }

  get message(): string {
    return this.rawMessage;
  }

  @Input()
  type: 'success' | 'error' | 'info' | '' = '';

  constructor(private readonly translate: TranslateService) {
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.translateMessage();
    });
  }

  private translateMessage(): void {
    if (!this.rawMessage) {
      this.translatedMessage = '';
      return;
    }

    const translated = this.translate.instant(this.rawMessage);

    // A komponens kulcsot és már lefordított / backendből érkező
    // szöveget is fogad. Ha nincs ilyen translation key, az eredeti
    // szöveget jelenítjük meg.
    this.translatedMessage = translated === this.rawMessage ? this.rawMessage : translated;
  }

  get messageClasses(): string {
    switch (this.type) {
      case 'success':
        return 'border-success-200 bg-success-50 text-success-700';

      case 'error':
        return 'border-delete-200 bg-delete-50 text-delete-700';

      case 'info':
        return 'border-info-200 bg-info-50 text-info-700';

      default:
        return 'border-surface-200 bg-surface-50 text-content-700';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
