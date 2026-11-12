import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { introductionGuard } from './introduction.guard';

describe('introductionGuard', () => {
  it('opens the static introduction and cancels Angular navigation', () => {
    const replace = jasmine.createSpy('replace');
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { location: { replace } } }],
    });

    const result = TestBed.runInInjectionContext(() => introductionGuard(
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
    ));

    expect(replace).toHaveBeenCalledOnceWith('/edzestervezo/');
    expect(result).toBeFalse();
  });
});
