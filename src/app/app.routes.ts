import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    // Todo lo de /admin exige sesión y rol admin
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    children: [
      {
        path: '',
        loadComponent: () => import('./admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'productos',
        loadComponent: () => import('./admin/products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'productos/nuevo',
        loadComponent: () =>
          import('./admin/products/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./admin/products/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: 'promociones',
        loadComponent: () =>
          import('./admin/promotions/promotions.page').then((m) => m.PromotionsPage),
      },
      {
        path: 'promociones/nuevo',
        loadComponent: () =>
          import('./admin/promotions/promotion-form.page').then((m) => m.PromotionFormPage),
      },
      {
        path: 'promociones/:id',
        loadComponent: () =>
          import('./admin/promotions/promotion-form.page').then((m) => m.PromotionFormPage),
      },
    ],
  },
  {
    // Catálogo del preventista (el admin también puede verlo)
    path: 'preventista',
    canActivate: [authGuard, roleGuard('preventista', 'admin')],
    children: [
      {
        path: '',
        loadComponent: () => import('./preventista/preventista.page').then((m) => m.PreventistaPage),
      },
      {
        path: 'promociones',
        loadComponent: () =>
          import('./preventista/promos.page').then((m) => m.PreventistaPromosPage),
      },
    ],
  },
  {
    // Pantalla de la fase 1 (prueba de conexión con el API)
    path: 'estado',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
