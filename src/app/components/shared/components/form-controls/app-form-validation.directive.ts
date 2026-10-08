import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { validateFields } from './field-validation';

/** Validate before Angular's ngSubmit, including keyboard submissions. */
@Directive({ selector: 'form', standalone: true })
export class AppFormValidationDirective implements OnInit, OnDestroy {
  private readonly form = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly onSubmit = (event: Event) => {
    if (!validateFields(this.form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  ngOnInit(): void {
    this.form.addEventListener('submit', this.onSubmit, true);
  }
  ngOnDestroy(): void {
    this.form.removeEventListener('submit', this.onSubmit, true);
  }
}
