import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

/** Solo entra quien tiene sesión; si no, va al login */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

/** Solo entra el rol indicado; si no, va a su propio inicio */
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.role();
  if (role && roles.includes(role)) return true;
  return router.createUrlTree([auth.isLoggedIn() ? auth.homeFor(role) : '/login']);
};

/** El login solo se ve sin sesión; con sesión manda al inicio del rol */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree([auth.homeFor(auth.role())]) : true;
};
