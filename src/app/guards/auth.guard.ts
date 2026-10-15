import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  // Récupérer les services avant le premier await.
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.restore();

  if (auth.user()) {
    return true;
  }

  await router.navigate(['/login']);
  return false;
};