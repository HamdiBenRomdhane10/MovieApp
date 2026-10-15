import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  // Pages publiques (réservées aux visiteurs non connectés)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },

  // Application (réservée aux utilisateurs connectés) : 4 onglets + 1 onglet admin
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
      { path: 'favorites', loadComponent: () => import('./pages/favorites/favorites.page').then((m) => m.FavoritesPage) },
      { path: 'matches', loadComponent: () => import('./pages/matches/matches.page').then((m) => m.MatchesPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage) },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/home' },
];
