import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, addCircleOutline, closeCircle, remove, searchOutline, warningOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { CatalogService } from '../../core/catalog.service';
import { Client, ClientsService } from '../../core/clients.service';
import { errorMessage, money } from '../../core/format';
import { OrderDetail, OrdersService, StockWarning } from '../../core/orders.service';
import { PricedProduct, applyBestPromo } from '../../core/pricing';
import { PromotionsService } from '../../core/promotions.service';
import { ToastService } from '../../core/toast.service';

/** Una línea del pedido en pantalla (el precio final lo vuelve a calcular el API) */
interface Line {
  product_id: number;
  name: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  applied_price: number;
  promo_title: string | null;
  /** null si el producto ya no está en el catálogo (inactivo) */
  stock: number | null;
}

const MAX_QTY = 100000;
const MAX_RESULTS = 30;

@Component({
  selector: 'app-prev-order-form',
  templateUrl: 'order-form.page.html',
  styleUrls: ['../prev-shared.scss', 'order-form.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon,
    IonContent, IonFooter, IonSpinner,
  ],
})
export class PrevOrderFormPage {
  private orders = inject(OrdersService);
  private clientsApi = inject(ClientsService);
  private catalog = inject(CatalogService);
  private promotions = inject(PromotionsService);
  private nav = inject(NavController);
  private route = inject(ActivatedRoute);
  private alerts = inject(AlertController);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  /** Viene de /preventista/pedidos/:id/editar (no existe en /nuevo) */
  id = input<string>();

  readonly money = money;

  clients = signal<Client[]>([]);
  products = signal<PricedProduct[]>([]);
  editing = signal<OrderDetail | null>(null);
  loading = signal(true);
  loadError = signal('');
  saving = signal(false);
  submitted = signal(false);
  private loadedFor: string | null = null;

  clientId = signal<number | null>(null);
  notes = signal('');
  lines = signal<Line[]>([]);
  productSearch = signal('');

  isEdit = computed(() => !!this.id());
  /** El admin vuelve a /admin/pedidos; el preventista a /preventista/pedidos */
  base = computed(() => (this.auth.role() === 'admin' ? '/admin/pedidos' : '/preventista/pedidos'));
  client = computed(() => this.clients().find((c) => c.id === this.clientId()) ?? null);
  inOrder = computed(() => new Map(this.lines().map((l) => [l.product_id, l.quantity])));

  results = computed(() => {
    const q = this.productSearch().trim().toLowerCase();
    return this.products()
      .filter(
        (p) =>
          !q ||
          [p.name, p.brand ?? '', p.category_name ?? ''].some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, MAX_RESULTS);
  });

  totals = computed(() => {
    let subtotal = 0;
    let total = 0;
    let units = 0;
    for (const l of this.lines()) {
      subtotal += l.unit_price * l.quantity;
      total += l.applied_price * l.quantity;
      units += l.quantity;
    }
    return { subtotal, discount: subtotal - total, total, units };
  });

  overStock = computed(() => this.lines().filter((l) => l.stock !== null && l.quantity > l.stock));

  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.clientId()) e['client'] = 'Elige el cliente.';
    if (this.lines().length === 0) e['lines'] = 'Agrega al menos un producto.';
    return e;
  });

  constructor() {
    addIcons({ add, addCircleOutline, closeCircle, remove, searchOutline, warningOutline });
  }

  ionViewWillEnter() {
    const key = this.id() ?? 'nuevo';
    const fromQuery = Number(this.route.snapshot.queryParamMap.get('cliente')) || null;

    // Al volver de "Nuevo cliente" NO se borra lo que ya se había agregado
    if (this.loadedFor === key) {
      this.clientsApi.list().subscribe({
        next: (list) => {
          this.clients.set(list);
          if (fromQuery) this.clientId.set(fromQuery);
        },
      });
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.submitted.set(false);
    const orderId = this.id() ? Number(this.id()) : null;

    forkJoin({
      clients: this.clientsApi.list(),
      products: this.catalog.products(),
      promos: this.promotions.active(),
      order: orderId ? this.orders.get(orderId) : of(null),
    }).subscribe({
      next: ({ clients, products, promos, order }) => {
        const priced = applyBestPromo(products, promos);
        this.clients.set(clients);
        this.products.set(priced);
        this.editing.set(order);
        this.productSearch.set('');

        if (order) {
          if (order.status === 'anulado') {
            this.loadError.set('Este pedido está anulado y no se puede editar.');
          }
          const stock = new Map(priced.map((p) => [p.id, p.stock]));
          // Si el cliente no está en la lista (p. ej. lo reasignaron), se agrega para no perderlo
          if (!clients.some((c) => c.id === order.client_id)) {
            this.clients.set([
              ...clients,
              { id: order.client_id, name: order.client_name } as Client,
            ]);
          }
          this.clientId.set(order.client_id);
          this.notes.set(order.notes ?? '');
          // Los productos que ya estaban conservan el precio pactado (igual que en el API)
          this.lines.set(
            order.items.map((i) => ({
              product_id: i.product_id,
              name: i.product_name,
              unit: i.unit,
              quantity: i.quantity,
              unit_price: i.unit_price,
              applied_price: i.applied_price,
              promo_title: i.promotion_title,
              stock: stock.get(i.product_id) ?? null,
            }))
          );
        } else {
          this.clientId.set(fromQuery && clients.some((c) => c.id === fromQuery) ? fromQuery : null);
          this.notes.set('');
          this.lines.set([]);
        }
        this.loadedFor = key;
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'No se pudo cargar la información.'));
        this.loading.set(false);
      },
    });
  }

  newClient() {
    void this.nav.navigateForward('/preventista/clientes/nuevo', { queryParams: { volver: 'pedido' } });
  }

  addProduct(p: PricedProduct) {
    const existing = this.lines().find((l) => l.product_id === p.id);
    if (existing) {
      this.setQty(p.id, existing.quantity + 1);
      return;
    }
    this.lines.update((ls) => [
      ...ls,
      {
        product_id: p.id,
        name: p.name,
        unit: p.unit,
        quantity: 1,
        unit_price: p.current_price,
        applied_price: p.finalPrice,
        promo_title: p.promo?.title ?? null,
        stock: p.stock,
      },
    ]);
  }

  setQty(productId: number, qty: number) {
    if (!Number.isFinite(qty)) return;
    const q = Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
    this.lines.update((ls) => ls.map((l) => (l.product_id === productId ? { ...l, quantity: q } : l)));
  }

  /** Lo que se escribe en la casilla: si queda vacía o en 0, se respeta al salir del campo */
  typedQty(productId: number, event: Event) {
    const el = event.target as HTMLInputElement;
    const v = Number(el.value);
    if (el.value !== '' && v >= 1) this.setQty(productId, v);
  }

  fixQty(l: Line, event: Event) {
    const el = event.target as HTMLInputElement;
    el.value = String(l.quantity);
  }

  removeLine(productId: number) {
    this.lines.update((ls) => ls.filter((l) => l.product_id !== productId));
  }

  async send() {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0 || this.saving()) return;

    const t = this.totals();
    const alert = await this.alerts.create({
      header: this.isEdit() ? 'Guardar cambios' : 'Enviar pedido',
      message: `${this.client()?.name ?? ''}: ${this.lines().length} producto(s), total ${money(t.total)}. ¿Continuar?`,
      buttons: [
        { text: 'Revisar', role: 'cancel' },
        { text: this.isEdit() ? 'Guardar' : 'Enviar', role: 'confirm' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') return;

    const body = {
      client_id: this.clientId()!,
      notes: this.notes().trim() || null,
      items: this.lines().map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
    };
    this.saving.set(true);
    const editing = this.editing();
    const req = editing ? this.orders.update(editing.id, body) : this.orders.create(body);

    req.subscribe({
      next: async (res) => {
        this.saving.set(false);
        const id = editing ? editing.id : (res as { id?: number }).id!;
        void this.toast.show(
          `${editing ? 'Pedido actualizado' : `Pedido #${id} enviado`} · ${money(res.total)}`,
          'success'
        );
        await this.showWarnings(res.warnings);
        this.loadedFor = null; // la próxima vez arranca limpio
        void this.nav.navigateRoot([this.base(), id]);
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err, 'No se pudo guardar el pedido.'), 'danger');
      },
    });
  }

  private async showWarnings(warnings: StockWarning[] = []) {
    if (warnings.length === 0) return;
    const alert = await this.alerts.create({
      header: 'Ojo con el stock',
      message:
        'Estos productos se pidieron por encima de lo disponible; el administrador lo revisará al confirmar: ' +
        warnings.map((w) => `${w.name} (pediste ${w.quantity}, hay ${w.stock})`).join('; '),
      buttons: ['Entendido'],
    });
    await alert.present();
    await alert.onDidDismiss();
  }
}
