import { Component, computed, inject, input, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { pricetagOutline } from 'ionicons/icons';
import {
  CatalogService,
  Category,
  PriceHistory,
  Product,
} from '../../core/catalog.service';
import { errorMessage, money, shortDate } from '../../core/format';
import { PriceDialog } from '../../core/price-dialog.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-product-form',
  templateUrl: 'product-form.page.html',
  styleUrls: ['product-form.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton,
    IonContent, IonIcon, IonSpinner,
  ],
})
export class ProductFormPage {
  private catalog = inject(CatalogService);
  private nav = inject(NavController);
  private priceDialog = inject(PriceDialog);
  private toast = inject(ToastService);

  /** Viene de la ruta /admin/productos/:id (no existe en /nuevo) */
  id = input<string>();

  readonly money = money;
  readonly shortDate = shortDate;

  categories = signal<Category[]>([]);
  history = signal<PriceHistory[]>([]);
  current = signal<Product | null>(null);

  loading = signal(true);
  saving = signal(false);
  loadError = signal('');
  submitted = signal(false);

  // Campos del formulario (los números se guardan como texto mientras se escribe)
  name = signal('');
  description = signal('');
  categoryId = signal<number | null>(null);
  brand = signal('');
  unit = signal('unidad');
  basePrice = signal('');
  currentPrice = signal('');
  stock = signal('0');

  isEdit = computed(() => !!this.id());

  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.name().trim()) e['name'] = 'El nombre es obligatorio.';
    if (!this.isEdit()) {
      const p = Number(this.currentPrice());
      if (!this.currentPrice() || !(p > 0)) e['currentPrice'] = 'Escribe un precio mayor que cero.';
    }
    if (this.basePrice() !== '' && !(Number(this.basePrice()) >= 0)) e['basePrice'] = 'Precio no válido.';
    const s = Number(this.stock());
    if (this.stock() === '' || !Number.isInteger(s) || s < 0) e['stock'] = 'El stock debe ser un número entero, 0 o más.';
    return e;
  });

  constructor() {
    addIcons({ pricetagOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.loadError.set('');
    this.submitted.set(false);
    const id = this.id() ? Number(this.id()) : null;

    forkJoin({
      categories: this.catalog.categories(),
      product: id ? this.catalog.product(id) : of(null),
      history: id ? this.catalog.priceHistory(id) : of([] as PriceHistory[]),
    }).subscribe({
      next: ({ categories, product, history }) => {
        this.categories.set(categories);
        this.history.set(history);
        this.current.set(product);
        if (product) {
          this.name.set(product.name);
          this.description.set(product.description ?? '');
          this.categoryId.set(product.category_id);
          this.brand.set(product.brand ?? '');
          this.unit.set(product.unit);
          this.basePrice.set(String(product.base_price));
          this.stock.set(String(product.stock));
        } else {
          this.name.set(''); this.description.set(''); this.categoryId.set(null);
          this.brand.set(''); this.unit.set('unidad'); this.basePrice.set('');
          this.currentPrice.set(''); this.stock.set('0');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'No se pudo cargar el producto.'));
        this.loading.set(false);
      },
    });
  }

  onCategory(value: string) {
    this.categoryId.set(value === '' ? null : Number(value));
  }

  save() {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0 || this.saving()) return;

    // Siempre se envían todos los campos (null si están vacíos): el API no acepta "undefined"
    const common = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      category_id: this.categoryId(),
      brand: this.brand().trim() || null,
      unit: this.unit().trim() || 'unidad',
      stock: Number(this.stock()),
    };

    this.saving.set(true);
    const product = this.current();

    const request = product
      ? this.catalog.updateProduct(product.id, {
          ...common,
          base_price: this.basePrice() === '' ? product.base_price : Number(this.basePrice()),
        })
      : this.catalog.createProduct({
          ...common,
          base_price: this.basePrice() === '' ? Number(this.currentPrice()) : Number(this.basePrice()),
          current_price: Number(this.currentPrice()),
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        void this.toast.show(product ? 'Producto actualizado' : 'Producto creado', 'success');
        this.nav.navigateBack('/admin/productos');
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }

  async changePrice() {
    const p = this.current();
    if (!p) return;
    const result = await this.priceDialog.ask(p.name, p.current_price);
    if (!result) return;
    this.catalog.changePrice(p.id, result.price, result.reason).subscribe({
      next: () => {
        this.current.set({ ...p, current_price: result.price });
        this.catalog.priceHistory(p.id).subscribe((h) => this.history.set(h));
        void this.toast.show('Precio actualizado', 'success');
      },
      error: (err) => void this.toast.show(errorMessage(err), 'danger'),
    });
  }
}
