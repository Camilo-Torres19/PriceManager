import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertOutline, cubeOutline, logOutOutline, megaphoneOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { forkJoin } from 'rxjs';
import { CatalogService, Product } from '../core/catalog.service';
import { money, shortDate } from '../core/format';
import { promoStatus } from '../core/promo-utils';
import { Promotion, PromotionsService } from '../core/promotions.service';

const LOW_STOCK = 10;

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, RouterLink],
})
export class AdminPage {
  auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private promotions = inject(PromotionsService);

  readonly money = money;
  readonly shortDate = shortDate;

  products = signal<Product[]>([]);
  promos = signal<Promotion[]>([]);
  loading = signal(true);
  error = signal('');

  total = computed(() => this.products().length);
  activePromos = computed(() => this.promos().filter((p) => promoStatus(p) === 'vigente').length);
  lowStock = computed(() => this.products().filter((p) => p.stock <= LOW_STOCK).length);
  recent = computed(() =>
    [...this.products()]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4)
  );

  constructor() {
    addIcons({ alertOutline, cubeOutline, logOutOutline, megaphoneOutline });
  }

  ionViewWillEnter() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ products: this.catalog.products(), promos: this.promotions.all() }).subscribe({
      next: ({ products, promos }) => {
        this.products.set(products);
        this.promos.set(promos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos.');
        this.loading.set(false);
      },
    });
  }
}
