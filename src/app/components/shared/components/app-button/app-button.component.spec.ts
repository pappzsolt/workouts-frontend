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
    expect(button.getAppearanceClasses()).toBe('btn-outline');
    button.variant = 'delete';
    expect(button.getAppearanceClasses()).toBe('btn-delete');
    button.appearance = 'ghost';
    expect(button.getAppearanceClasses()).toBe('btn-ghost-delete');
    button.variant = 'secondary';
    expect(button.getAppearanceClasses()).toBe('btn-ghost');
  });

  it('keeps the selected step distinct from completed steps', () => {
    const button = new AppButtonComponent();
    button.completed = true;
    expect(button.getAppearanceClasses()).toBe('btn-tonal');
    button.active = true;
    expect(button.getAppearanceClasses()).toBe('btn-primary');
    button.active = false;
    expect(button.getAppearanceClasses()).toBe('btn-tonal');
  });

  it('supports link styling without changing the button action type', () => {
    const button = new AppButtonComponent();
    button.appearance = 'link';
    expect(button.getAppearanceClasses()).toBe('btn-link');
    expect(button.type).toBe('button');
  });

  it('maps every variant to the shared .btn-* classes', () => {
    const button = new AppButtonComponent();
    const expected: Record<string, string> = {
      primary: 'btn-primary', save: 'btn-primary', add: 'btn-primary', search: 'btn-primary',
      edit: 'btn-tonal', secondary: 'btn-neutral', sort: 'btn-neutral',
      delete: 'btn-delete', danger: 'btn-danger', inverse: 'btn-inverse',
    };
    for (const [variant, cls] of Object.entries(expected)) {
      button.variant = variant as AppButtonComponent['variant'];
      expect(button.getAppearanceClasses()).toBe(cls);
    }
  });
});
