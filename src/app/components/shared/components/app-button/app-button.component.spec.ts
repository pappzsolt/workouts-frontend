import { AppButtonComponent } from './app-button.component';

describe('AppButtonComponent', () => {
  it('preserves existing defaults', () => {
    const button = new AppButtonComponent();
    expect(button.variant).toBe('primary');
    expect(button.type).toBe('button');
    expect(button.size).toBe('md');
    expect(button.appearance).toBe('solid');
    expect(button.floating).toBeFalse();
    expect(button.getAppearanceClasses()).toBe(button.getVariantClasses());
  });

  it('forwards the original mouse event to callers', () => {
    const button = new AppButtonComponent();
    const clicked = jasmine.createSpy('clicked');
    button.buttonClick.subscribe(clicked);
    const event = { stopPropagation: jasmine.createSpy() } as unknown as MouseEvent;
    button.onClick(event);
    expect(clicked).toHaveBeenCalledOnceWith(event);
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('blocks disabled actions and default form submission', () => {
    const button = new AppButtonComponent();
    button.disabled = true;
    const clicked = jasmine.createSpy('clicked');
    button.buttonClick.subscribe(clicked);
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
    } as unknown as MouseEvent;
    button.onClick(event);
    expect(clicked).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('supports neutral and destructive outline and ghost actions', () => {
    const button = new AppButtonComponent();
    button.appearance = 'outline';
    expect(button.getAppearanceClasses()).toContain('border-surface-300');
    button.variant = 'delete';
    expect(button.getAppearanceClasses()).toContain('border-delete-200');
    button.appearance = 'ghost';
    expect(button.getAppearanceClasses()).toContain('bg-transparent');
    expect(button.getAppearanceClasses()).toContain('text-delete-700');
  });

  it('keeps the selected step distinct from completed steps', () => {
    const button = new AppButtonComponent();
    button.completed = true;
    expect(button.getAppearanceClasses()).toContain('bg-save-50');
    button.active = true;
    expect(button.getAppearanceClasses()).toContain('bg-primary-700');
    button.active = false;
    expect(button.getAppearanceClasses()).toContain('bg-save-50');
  });

  it('supports link styling without changing the button action type', () => {
    const button = new AppButtonComponent();
    button.appearance = 'link';
    expect(button.getAppearanceClasses()).toContain('hover:underline');
    expect(button.type).toBe('button');
  });
});
