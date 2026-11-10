import { Injectable } from '@angular/core';

interface Recaptcha {
  ready(callback: () => void): void;
  render(element: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }): number;
  reset(id: number): void;
}
export function recaptchaApi(): Recaptcha | undefined {
  return (window as Window & { grecaptcha?: Recaptcha }).grecaptcha;
}
@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private loading?: Promise<Recaptcha>;
  load(): Promise<Recaptcha> {
    if (this.loading) return this.loading;
    this.loading = new Promise<Recaptcha>((resolve, reject) => {
      const script = document.createElement('script');
      let finished = false;
      const fail = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        script.remove();
        this.loading = undefined;
        reject(new Error('CAPTCHA unavailable'));
      };
      const timeout = setTimeout(fail, 15000);
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = fail;
      script.onload = () => {
        const api = recaptchaApi();
        if (!api) { fail(); return; }
        api.ready(() => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          resolve(api);
        });
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
