import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  copyOutline,
  gridOutline,
  logOutOutline,
  megaphoneOutline,
  pricetagsOutline,
  searchOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { CatalogService, Category } from '../core/catalog.service';
import { errorMessage, money } from '../core/format';
import { PricedProduct, applyBestPromo, vigentes } from '../core/pricing';
import { badgeLabel } from '../core/promo-utils';
import { Promotion, PromotionsService } from '../core/promotions.service';
import { ToastService } from '../core/toast.service';
import { PrevNavComponent } from './nav/prev-nav.component';

const LOW_STOCK = 10;

@Component({
  selector: 'app-preventista',
  templateUrl: 'preventista.page.html',
  styleUrls: ['preventista.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonSpinner, IonRefresher, IonRefresherContent, PrevNavComponent,
  ],
})
export class PreventistaPage {
  auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private promotions = inject(PromotionsService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly money = money;
  readonly badgeLabel = badgeLabel;
  readonly lowStock = LOW_STOCK;

  products = signal<PricedProduct[]>([]);
  categories = signal<Category[]>([]);
  promos = signal<Promotion[]>([]);
  search = signal('');
  selectedCategory = signal<number | null>(null); // null = Todos
  loading = signal(true);
  error = signal('');

  activePromos = computed(() => vigentes(this.promos()));
  isAdmin = computed(() => this.auth.role() === 'admin');

  /** Solo se muestran chips de categorías que tienen productos */
  usedCategories = computed(() => {
    const ids = new Set(this.products().map((p) => p.category_id));
    return this.categories().filter((c) => ids.has(c.id));
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.selectedCategory();
    return this.products().filter(
      (p) =>
        (cat === null || p.category_id === cat) &&
        (!q ||
          [p.name, p.brand ?? '', p.category_name ?? '', p.description ?? ''].some((t) =>
            t.toLowerCase().includes(q)
          ))
    );
  });

  constructor() {
    addIcons({
      chevronForwardOutline, copyOutline, gridOutline, logOutOutline,
      megaphoneOutline, pricetagsOutline, searchOutline,
    });
  }

  ionViewWillEnter() {
    this.load();
  }

  /** Carga productos, categorías y promociones; done() cierra el pull-to-refresh */
  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    forkJoin({
      products: this.catalog.products(),
      categories: this.catalog.categories(),
      promos: this.promotions.active(),
    }).subscribe({
      next: ({ products, categories, promos }) => {
        this.promos.set(promos);
        this.categories.set(categories);
        this.products.set(applyBestPromo(products, promos));
        this.loading.set(false);
        done?.();
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudo cargar el catálogo.'));
        this.loading.set(false);
        done?.();
      },
    });
  }

  refresh(event: Event) {
    const target = event.target as HTMLIonRefresherElement;
    this.load(() => void target.complete());
  }

  goAdmin() {
    this.router.navigateByUrl('/admin');
  }

  openPromos() {
    this.router.navigateByUrl('/preventista/promociones');
  }

  /** Copia "Producto — $precio" para pegarlo en WhatsApp o donde se necesite */
  async copy(p: PricedProduct, event: Event) {
    event.stopPropagation();
    let text = `${p.name} — ${money(p.finalPrice)}`;
    if (p.promo) text += ` (antes ${money(p.current_price)}, ${p.promo.title})`;
    try {
      await navigator.clipboard.writeText(text);
      void this.toast.show('Copiado', 'success');
    } catch {
      void this.toast.show('No se pudo copiar', 'danger');
    }
  }
}
