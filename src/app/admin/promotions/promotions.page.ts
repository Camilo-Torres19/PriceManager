import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, addOutline, cubeOutline, megaphoneOutline, trashOutline } from 'ionicons/icons';
import { CatalogService, Product } from '../../core/catalog.service';
import { errorMessage, money } from '../../core/format';
import {
  PromoStatus,
  STATUS_LABEL,
  badgeLabel,
  discountedPrice,
  promoStatus,
  rangeLabel,
} from '../../core/promo-utils';
import { Promotion, PromotionsService } from '../../core/promotions.service';
import { ToastService } from '../../core/toast.service';

type Filter = 'todas' | PromoStatus;

@Component({
  selector: 'app-promotions',
  templateUrl: 'promotions.page.html',
  styleUrls: ['promotions.page.scss'],
  // Estilos de los precios antes/después (se suman a los del .scss)
  styles: [`
    .prices { margin-top: 10px; border-top: 1px solid #eef2f6; padding-top: 6px; }
    .pr-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 13px; color: #1f2933; }
    .pr-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pr-val { white-space: nowrap; }
    .old { color: #8a96a3; text-decoration: line-through; margin-right: 6px; }
    .new { color: #2e7d32; font-weight: 700; }
    .pr-more { font-size: 12px; color: #6b7785; padding-top: 2px; }
  `],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton,
    IonContent, IonIcon, IonSpinner, IonFab, IonFabButton, RouterLink,
  ],
})
export class PromotionsPage {
  private promotions = inject(PromotionsService);
  private router = inject(Router);
  private alerts = inject(AlertController);
  private toast = inject(ToastService);
  private catalog = inject(CatalogService);

  /** Cuántos productos se muestran con precio en cada tarjeta */
  private readonly MAX_LINES = 3;

  readonly money = money;
  readonly badgeLabel = badgeLabel;
  readonly rangeLabel = rangeLabel;
  readonly statusLabel = STATUS_LABEL;
  readonly filters: { key: Filter; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'vigente', label: 'Vigentes' },
    { key: 'programada', label: 'Programadas' },
    { key: 'vencida', label: 'Vencidas' },
    { key: 'inactiva', label: 'Inactivas' },
  ];

  items = signal<Promotion[]>([]);
  products = signal<Product[]>([]);
  filter = signal<Filter>('todas');
  loading = signal(true);
  error = signal('');

  private productMap = computed(() => new Map(this.products().map((p) => [p.id, p])));

  withStatus = computed(() => {
    const map = this.productMap();
    return this.items().map((p) => {
      // Solo aparecen los productos activos (GET /products no trae los desactivados)
      const found = p.product_ids.map((id) => map.get(id)).filter((x): x is Product => !!x);
      const lines = found.slice(0, this.MAX_LINES).map((x) => ({
        id: x.id,
        name: x.name,
        before: x.current_price,
        after: discountedPrice(x.current_price, p),
      }));
      return { ...p, status: promoStatus(p), lines, more: found.length - lines.length };
    });
  });

  visible = computed(() =>
    this.withStatus().filter((p) => this.filter() === 'todas' || p.status === this.filter())
  );

  counts = computed(() => {
    const c: Record<Filter, number> = { todas: 0, vigente: 0, programada: 0, vencida: 0, inactiva: 0 };
    for (const p of this.withStatus()) {
      c.todas++;
      c[p.status]++;
    }
    return c;
  });

  constructor() {
    addIcons({ add, addOutline, cubeOutline, megaphoneOutline, trashOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      list: this.promotions.all(),
      // Si fallan los productos, igual se muestran las promociones (sin precios)
      products: this.catalog.products().pipe(catchError(() => of([] as Product[]))),
    }).subscribe({
      next: ({ list, products }) => {
        this.items.set(list);
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar las promociones.'));
        this.loading.set(false);
      },
    });
  }

  edit(p: Promotion) {
    this.router.navigate(['/admin/promociones', p.id]);
  }

  toggle(p: Promotion, event: Event) {
    event.stopPropagation();
    this.promotions.toggle(p.id).subscribe({
      next: (res) => {
        this.items.update((list) =>
          list.map((x) => (x.id === p.id ? { ...x, is_active: res.is_active } : x))
        );
        void this.toast.show(res.message, 'success');
      },
      error: (err) => void this.toast.show(errorMessage(err), 'danger'),
    });
  }

  async remove(p: Promotion, event: Event) {
    event.stopPropagation();
    const alert = await this.alerts.create({
      header: 'Eliminar promoción',
      message: `«${p.title}» se eliminará definitivamente. Si solo quieres pausarla, mejor desactívala. ¿Eliminar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    this.promotions.remove(p.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.id !== p.id));
        void this.toast.show('Promoción eliminada', 'success');
      },
      error: (err) => void this.toast.show(errorMessage(err), 'danger'),
    });
  }
}
