import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { validateFields } from './field-validation';

/** Validate before Angular's ngSubmit, including keyboard submissions. */
@Directive({ selector: 'form', standalone: true })
export class AppFormValidationDirective implements OnInit, OnDestroy {
  @Output() readonly invalidSubmit = new EventEmitter<void>();
  private readonly form = inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly onSubmit = (event: Event) => {
    if (!validateFields(this.form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.invalidSubmit.emit();
    }
  };
  ngOnInit(): void {
    this.form.addEventListener('submit', this.onSubmit, true);
  }
  ngOnDestroy(): void {
    this.form.removeEventListener('submit', this.onSubmit, true);
  }
}
