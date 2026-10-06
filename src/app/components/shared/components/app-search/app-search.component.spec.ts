import {
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { AppSearchComponent } from './app-search.component';

describe('AppSearchComponent compatibility and optional controls', () => {
  let component: AppSearchComponent;
  let injector: EnvironmentInjector;
  let injectorDestroyed: boolean;
  let changed: jasmine.Spy;
  let input: jasmine.Spy;

  beforeEach(() => {
    jasmine.clock().install();
    injectorDestroyed = false;
    injector = createEnvironmentInjector([], Injector.NULL as EnvironmentInjector);
    component = runInInjectionContext(injector, () => new AppSearchComponent());
    changed = jasmine.createSpy('searchTermChange');
    input = jasmine.createSpy('searchTermInput');
    component.searchTermChange.subscribe(changed);
    component.searchTermInput.subscribe(input);
  });

  afterEach(() => {
    if (!injectorDestroyed) injector.destroy();
    jasmine.clock().uninstall();
  });

  it('preserves all existing defaults and the 300 ms output delay', () => {
    expect(component.label).toBe('coachPrograms.search');
    expect(component.placeholder).toBe('coachPrograms.searchPlaceholder');
    expect(component.inputId).toBe('appSearch');
    expect(component.showClearButton).toBeFalse();
    expect(component.disabled).toBeFalse();
    component.onSearchChange('program');
    jasmine.clock().tick(299);
    expect(changed).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(changed).toHaveBeenCalledOnceWith('program');
  });

  it('keeps the latest input visible and restarts the default delay while typing', () => {
    component.onSearchChange('p');
    jasmine.clock().tick(200);
    component.onSearchChange('program');
    expect(component.searchTerm).toBe('program');
    jasmine.clock().tick(299);
    expect(changed).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(changed).toHaveBeenCalledOnceWith('program');
  });

  it('keeps the existing distinct output behavior', () => {
    component.onSearchChange('program');
    jasmine.clock().tick(300);
    component.onSearchChange('program');
    jasmine.clock().tick(300);
    expect(changed).toHaveBeenCalledOnceWith('program');
  });

  it('supports the existing one-way input and two-way output pattern', () => {
    component.searchTerm = 'initial';
    expect(changed).not.toHaveBeenCalled();
    component.searchTermChange.subscribe((value) => {
      component.searchTerm = value;
    });
    component.onSearchChange('changed');
    jasmine.clock().tick(300);
    component.onSearchChange('changed');
    jasmine.clock().tick(300);
    expect(component.searchTerm).toBe('changed');
    expect(changed).toHaveBeenCalledOnceWith('changed');
  });

  it('exposes each raw value immediately without changing the debounced output', () => {
    component.onSearchChange('p');
    component.onSearchChange('program');
    expect(input.calls.allArgs()).toEqual([['p'], ['program']]);
    expect(changed).not.toHaveBeenCalled();
    jasmine.clock().tick(300);
    expect(changed).toHaveBeenCalledOnceWith('program');
  });

  it('emits synchronously when debounceMs is zero', () => {
    component.debounceMs = 0;
    component.onSearchChange('program');
    expect(changed).toHaveBeenCalledOnceWith('program');
  });

  it('supports a custom delay and uses updated settings for subsequent input', () => {
    component.debounceMs = 500;
    component.onSearchChange('first');
    jasmine.clock().tick(499);
    expect(changed).not.toHaveBeenCalled();
    jasmine.clock().tick(1);
    expect(changed).toHaveBeenCalledOnceWith('first');
    component.debounceMs = 0;
    component.onSearchChange('second');
    expect(changed.calls.allArgs()).toEqual([['first'], ['second']]);
  });

  it('uses a safe default for non-finite delays and treats negative delays as zero', () => {
    component.debounceMs = NaN;
    expect(component.debounceMs).toBe(300);
    component.debounceMs = Infinity;
    expect(component.debounceMs).toBe(300);
    component.debounceMs = -1;
    expect(component.debounceMs).toBe(0);
  });

  it('clears immediately and cancels a pending search instead of restoring it later', () => {
    component.onSearchChange('first');
    jasmine.clock().tick(300);
    component.onSearchChange('pending');
    component.clear();
    expect(component.searchTerm).toBe('');
    expect(input.calls.mostRecent().args).toEqual(['']);
    expect(changed.calls.allArgs()).toEqual([['first'], ['']]);
    jasmine.clock().tick(1000);
    expect(changed.calls.allArgs()).toEqual([['first'], ['']]);
  });

  it('ignores edits and clearing when disabled and cancels pending work', () => {
    component.onSearchChange('pending');
    component.disabled = true;
    component.onSearchChange('ignored');
    component.clear();
    jasmine.clock().tick(1000);
    expect(component.searchTerm).toBe('pending');
    expect(input).toHaveBeenCalledOnceWith('pending');
    expect(changed).not.toHaveBeenCalled();
    component.disabled = false;
    component.onSearchChange('enabled');
    jasmine.clock().tick(300);
    expect(changed).toHaveBeenCalledOnceWith('enabled');
  });

  it('does not overwrite an external reset with a delayed old input', () => {
    component.onSearchChange('first');
    jasmine.clock().tick(300);
    component.onSearchChange('pending');
    component.searchTerm = '';
    jasmine.clock().tick(1000);
    expect(component.searchTerm).toBe('');
    expect(changed).toHaveBeenCalledOnceWith('first');
    component.onSearchChange('first');
    jasmine.clock().tick(300);
    expect(changed.calls.allArgs()).toEqual([['first'], ['first']]);
  });

  it('does not schedule input after an immediate consumer resets the field', () => {
    component.searchTermInput.subscribe(() => {
      component.searchTerm = '';
    });
    component.onSearchChange('ignored');
    jasmine.clock().tick(1000);
    expect(component.searchTerm).toBe('');
    expect(changed).not.toHaveBeenCalled();
  });

  it('cancels delayed emissions when destroyed', () => {
    component.onSearchChange('pending');
    injector.destroy();
    injectorDestroyed = true;
    jasmine.clock().tick(1000);
    expect(changed).not.toHaveBeenCalled();
  });
});
