import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { CatalogService, Product } from '../core/catalog.service';
import { errorMessage, money } from '../core/format';
import { vigentes } from '../core/pricing';
import { TYPE_LABEL, dayLabel, discountedPrice } from '../core/promo-utils';
import { Promotion, PromotionsService } from '../core/promotions.service';

@Component({
  selector: 'app-preventista-promos',
  templateUrl: 'promos.page.html',
  styleUrls: ['promos.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton,
    IonContent, IonSpinner, IonRefresher, IonRefresherContent,
  ],
})
export class PreventistaPromosPage {
  private catalog = inject(CatalogService);
  private promotions = inject(PromotionsService);

  readonly money = money;

  products = signal<Product[]>([]);
  promos = signal<Promotion[]>([]);
  loading = signal(true);
  error = signal('');

  /** Promociones vigentes con sus productos (solo los activos) y precio antes → después */
  cards = computed(() => {
    const map = new Map(this.products().map((p) => [p.id, p]));
    return vigentes(this.promos()).map((promo) => ({
      promo,
      headline: this.headline(promo),
      until: promo.end_date ? `Hasta ${dayLabel(promo.end_date)}` : 'Sin fecha de fin',
      items: promo.product_ids
        .map((id) => map.get(id))
        .filter((p): p is Product => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          before: p.current_price,
          after: discountedPrice(p.current_price, promo),
        })),
    }));
  });

  ionViewWillEnter() {
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    forkJoin({ products: this.catalog.products(), promos: this.promotions.active() }).subscribe({
      next: ({ products, promos }) => {
        this.products.set(products);
        this.promos.set(promos);
        this.loading.set(false);
        done?.();
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar las promociones.'));
        this.loading.set(false);
        done?.();
      },
    });
  }

  refresh(event: Event) {
    const target = event.target as HTMLIonRefresherElement;
    this.load(() => void target.complete());
  }

  private headline(p: Promotion): string {
    if (p.type === 'discount_percent') return `${Number(p.discount_value)}% OFF`;
    if (p.type === 'discount_fixed') return `${money(p.discount_value)} OFF`;
    return TYPE_LABEL[p.type];
  }
}
