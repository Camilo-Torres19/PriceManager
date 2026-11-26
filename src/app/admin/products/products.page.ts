import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
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
import {
  add,
  addOutline,
  cubeOutline,
  createOutline,
  pricetagOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
import { CatalogService, Category, Product } from '../../core/catalog.service';
import { errorMessage, money } from '../../core/format';
import { PriceDialog } from '../../core/price-dialog.service';
import { ToastService } from '../../core/toast.service';

const LOW_STOCK = 10;

@Component({
  selector: 'app-products',
  templateUrl: 'products.page.html',
  styleUrls: ['products.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton,
    IonContent, IonIcon, IonSpinner, IonFab, IonFabButton, RouterLink,
  ],
})
export class ProductsPage {
  private catalog = inject(CatalogService);
  private router = inject(Router);
  private alerts = inject(AlertController);
  private priceDialog = inject(PriceDialog);
  private toast = inject(ToastService);

  readonly money = money;
  readonly lowStock = LOW_STOCK;

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  search = signal('');
  selectedCategory = signal<number | null>(null); // null = Todos
  loading = signal(true);
  error = signal('');

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.selectedCategory();
    return this.products().filter(
      (p) =>
        (cat === null || p.category_id === cat) &&
        (!q || [p.name, p.brand ?? '', p.category_name ?? ''].some((t) => t.toLowerCase().includes(q)))
    );
  });

  constructor() {
    addIcons({ add, addOutline, cubeOutline, createOutline, pricetagOutline, searchOutline, trashOutline });
  }

  /** Se ejecuta cada vez que se entra a la pantalla (también al volver del formulario) */
  ionViewWillEnter() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ products: this.catalog.products(), categories: this.catalog.categories() }).subscribe({
      next: ({ products, categories }) => {
        this.products.set(products);
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar los productos.'));
        this.loading.set(false);
      },
    });
  }

  edit(p: Product) {
    this.router.navigate(['/admin/productos', p.id]);
  }

  async changePrice(p: Product, event: Event) {
    event.stopPropagation();
    const result = await this.priceDialog.ask(p.name, p.current_price);
    if (!result) return;
    this.catalog.changePrice(p.id, result.price, result.reason).subscribe({
      next: () => {
        this.products.update((list) =>
          list.map((x) => (x.id === p.id ? { ...x, current_price: result.price } : x))
        );
        void this.toast.show('Precio actualizado', 'success');
      },
      error: (err) => void this.toast.show(errorMessage(err), 'danger'),
    });
  }

  async remove(p: Product, event: Event) {
    event.stopPropagation();
    const alert = await this.alerts.create({
      header: 'Desactivar producto',
      message: `«${p.name}» dejará de verse en el catálogo. ¿Continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Desactivar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;

    this.catalog.deactivateProduct(p.id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((x) => x.id !== p.id));
        void this.toast.show('Producto desactivado', 'success');
      },
      error: (err) => void this.toast.show(errorMessage(err), 'danger'),
    });
  }
}
