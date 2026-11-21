
import { inject, DOCUMENT } from '@angular/core';
import { CanActivateFn } from '@angular/router';

/** Load the existing static introduction outside the Angular application. */
export const introductionGuard: CanActivateFn = () => {
  inject(DOCUMENT).location.replace('/edzestervezo/');
  return false;
};
