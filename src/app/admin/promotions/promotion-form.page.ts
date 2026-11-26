import { Component, computed, inject, input, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { CatalogService, Product } from '../../core/catalog.service';
import { errorMessage, money } from '../../core/format';
import { TYPE_LABEL, discountedPrice, todayStr } from '../../core/promo-utils';
import { PromoType, Promotion, PromotionsService } from '../../core/promotions.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-promotion-form',
  templateUrl: 'promotion-form.page.html',
  styleUrls: ['promotion-form.page.scss'],
  // Estilos de la vista previa de precios (se suman a los del .scss)
  styles: [`
    .preview { margin-top: 14px; border: 1px solid #dfe6ee; border-radius: 12px; overflow: hidden; background: #fff; }
    .pv-head { padding: 8px 12px; font-size: 13px; font-weight: 600; color: #1a3a6b; background: #f0f4f8; }
    .pv-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid #eef2f6; font-size: 14px; color: #1f2933; }
    .pv-row.zero { background: #fdecea; }
    .pv-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pv-price { white-space: nowrap; }
    .old { color: #8a96a3; text-decoration: line-through; margin-right: 6px; font-size: 13px; }
    .new { color: #2e7d32; font-weight: 700; }
    .pv-row.zero .new { color: #c62828; }
    .pk-meta .new { font-size: 13px; }
    .warn { display: block; margin-top: 6px; color: #c62828; }
  `],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSpinner],
})
export class PromotionFormPage {
  private promotions = inject(PromotionsService);
  private catalog = inject(CatalogService);
  private nav = inject(NavController);
  private toast = inject(ToastService);

  /** Viene de /admin/promociones/:id (no existe en /nuevo) */
  id = input<string>();

  readonly money = money;

  products = signal<Product[]>([]);
  current = signal<Promotion | null>(null);
  loading = signal(true);
  saving = signal(false);
  loadError = signal('');
  submitted = signal(false);

  title = signal('');
  description = signal('');
  type = signal<PromoType>('discount_percent');
  value = signal('');
  startDate = signal('');
  endDate = signal('');
  selectedIds = signal<number[]>([]);
  productSearch = signal('');

  isEdit = computed(() => !!this.id());

  /** Por ahora solo porcentaje y valor fijo; si la promoción ya era de otro tipo, se conserva */
  typeOptions = computed(() => {
    const base: { value: PromoType; label: string }[] = [
      { value: 'discount_percent', label: 'Porcentaje (%)' },
      { value: 'discount_fixed', label: 'Valor fijo ($)' },
    ];
    const t = this.current()?.type;
    if (t && !base.some((o) => o.value === t)) base.push({ value: t, label: TYPE_LABEL[t] });
    return base;
  });

  valueLabel = computed(() => {
    const t = this.type();
    if (t === 'discount_percent') return 'Porcentaje de descuento (1 a 100)';
    if (t === 'discount_fixed') return 'Pesos que se le RESTAN al precio de cada producto (no es el precio final). Ej: arroz a $3.500 con 500 → queda en $3.000.';
    return 'Valor del descuento';
  });

  selectedSet = computed(() => new Set(this.selectedIds()));

  /** El valor escrito es válido para calcular precios (porcentaje 1–100 o pesos > 0) */
  valueValid = computed(() => {
    const v = Number(this.value());
    if (this.value() === '' || !(v > 0)) return false;
    return this.type() !== 'discount_percent' || v <= 100;
  });

  /** Precio antes → después de cada producto elegido (solo porcentaje y valor fijo) */
  preview = computed(() => {
    const t = this.type();
    if (!this.valueValid() || (t !== 'discount_percent' && t !== 'discount_fixed')) return [];
    const promo = { type: t, discount_value: Number(this.value()) };
    const sel = this.selectedSet();
    return this.products()
      .filter((p) => sel.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, before: p.current_price, after: discountedPrice(p.current_price, promo) }));
  });

  /** Productos que quedarían en $0 con este descuento (casi seguro es un error) */
  zeroed = computed(() => this.preview().filter((r) => r.after <= 0));

  /** Precio con descuento de un producto de la lista (null si no aplica) */
  afterPrice(p: Product): number | null {
    const t = this.type();
    if (!this.valueValid() || (t !== 'discount_percent' && t !== 'discount_fixed')) return null;
    return discountedPrice(p.current_price, { type: t, discount_value: Number(this.value()) });
  }

  visibleProducts = computed(() => {
    const q = this.productSearch().trim().toLowerCase();
    return this.products().filter(
      (p) => !q || [p.name, p.brand ?? '', p.category_name ?? ''].some((t) => t.toLowerCase().includes(q))
    );
  });

  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.title().trim()) e['title'] = 'El título es obligatorio.';
    const v = Number(this.value());
    if (this.type() === 'discount_percent' && !(this.value() !== '' && v > 0 && v <= 100)) {
      e['value'] = 'Escribe un porcentaje entre 1 y 100.';
    } else if (this.type() === 'discount_fixed' && !(this.value() !== '' && v > 0)) {
      e['value'] = 'Escribe un valor mayor que cero.';
    }
    if (this.startDate() && this.endDate() && this.endDate() < this.startDate()) {
      e['dates'] = 'La fecha fin no puede ser anterior a la de inicio.';
    }
    if (this.selectedIds().length === 0) e['products'] = 'Elige al menos un producto.';
    else if (this.zeroed().length > 0) {
      e['products'] = `Con este descuento quedarían en $0: ${this.zeroed().map((r) => r.name).join(', ')}. Revisa el valor.`;
    }
    return e;
  });

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.loadError.set('');
    this.submitted.set(false);
    this.productSearch.set('');
    const id = this.id() ? Number(this.id()) : null;

    forkJoin({
      products: this.catalog.products(),
      all: id ? this.promotions.all() : of([] as Promotion[]),
    }).subscribe({
      next: ({ products, all }) => {
        this.products.set(products);
        const promo = id ? (all.find((p) => p.id === id) ?? null) : null;

        if (id && !promo) {
          this.loadError.set('Promoción no encontrada.');
          this.loading.set(false);
          return;
        }
        this.current.set(promo);
        if (promo) {
          this.title.set(promo.title);
          this.description.set(promo.description ?? '');
          this.type.set(promo.type);
          this.value.set(String(promo.discount_value));
          this.startDate.set(promo.start_date ?? '');
          this.endDate.set(promo.end_date ?? '');
          this.selectedIds.set([...promo.product_ids]);
        } else {
          this.title.set(''); this.description.set('');
          this.type.set('discount_percent'); this.value.set('');
          this.startDate.set(todayStr()); this.endDate.set('');
          this.selectedIds.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'No se pudo cargar la información.'));
        this.loading.set(false);
      },
    });
  }

  isSelected(id: number): boolean {
    return this.selectedSet().has(id);
  }

  toggleProduct(id: number) {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  selectVisible() {
    const add = this.visibleProducts().map((p) => p.id);
    this.selectedIds.update((ids) => [...new Set([...ids, ...add])]);
  }

  clearVisible() {
    const remove = new Set(this.visibleProducts().map((p) => p.id));
    this.selectedIds.update((ids) => ids.filter((x) => !remove.has(x)));
  }

  save() {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0 || this.saving()) return;

    // Se envían todos los campos (null si están vacíos)
    const body = {
      title: this.title().trim(),
      description: this.description().trim() || null,
      type: this.type(),
      discount_value: Number(this.value()),
      start_date: this.startDate() || null,
      end_date: this.endDate() || null,
      product_ids: this.selectedIds(),
    };

    this.saving.set(true);
    const promo = this.current();
    const request = promo ? this.promotions.update(promo.id, body) : this.promotions.create(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        void this.toast.show(promo ? 'Promoción actualizada' : 'Promoción creada', 'success');
        this.nav.navigateBack('/admin/promociones');
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }
}
