import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.restore();

  if (auth.user()) {
    await router.navigate(['/tabs/home']);
    return false;
  }

  return true;
};
