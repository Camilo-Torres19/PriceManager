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
import {
  alertOutline,
  cubeOutline,
  logOutOutline,
  megaphoneOutline,
  peopleOutline,
  personAddOutline,
  receiptOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { forkJoin } from 'rxjs';
import { CatalogService, Product } from '../core/catalog.service';
import { money, shortDate } from '../core/format';
import { promoStatus } from '../core/promo-utils';
import { Promotion, PromotionsService } from '../core/promotions.service';
import { OrdersService } from '../core/orders.service';
import { catchError, of } from 'rxjs';

const LOW_STOCK = 10;

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  // Estilos de los botones nuevos de la fase 6 (se suman a los del .scss)
  styles: [`
    .act.navy-b { background: #1a3a6b; color: #fff; }
    .act.orange-b { background: #ff9800; color: #fff; }
    .act .badge {
      margin-left: auto; min-width: 22px; padding: 1px 7px; border-radius: 11px;
      background: #fff; color: #e65100; font-size: 12px; font-weight: 800; text-align: center;
    }
  `],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, RouterLink],
})
export class AdminPage {
  auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private promotions = inject(PromotionsService);
  private orders = inject(OrdersService);

  readonly money = money;
  readonly shortDate = shortDate;

  products = signal<Product[]>([]);
  promos = signal<Promotion[]>([]);
  /** Pedidos pendientes por confirmar (null si no se pudieron cargar) */
  pending = signal<number | null>(null);
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
    addIcons({ alertOutline, cubeOutline, logOutOutline, megaphoneOutline, peopleOutline, personAddOutline, receiptOutline });
  }

  ionViewWillEnter() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      products: this.catalog.products(),
      promos: this.promotions.all(),
      // Si falla el conteo de pedidos, el panel igual carga
      pending: this.orders.list({ status: 'pendiente' }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ products, promos, pending }) => {
        this.products.set(products);
        this.promos.set(promos);
        this.pending.set(pending ? pending.length : null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos.');
        this.loading.set(false);
      },
    });
  }
}
