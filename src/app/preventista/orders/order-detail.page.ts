import { Component, computed, inject, input, signal } from '@angular/core';
import {
  AlertController,
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
import { callOutline, copyOutline, locationOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { errorMessage, money, shortDate } from '../../core/format';
import { OrderDetail, OrdersService, STATUS_TEXT, StockWarning } from '../../core/orders.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-order-detail',
  templateUrl: 'order-detail.page.html',
  styleUrls: ['../prev-shared.scss', 'order-detail.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent, IonSpinner],
})
export class OrderDetailPage {
  private orders = inject(OrdersService);
  private alerts = inject(AlertController);
  private nav = inject(NavController);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  /** /preventista/pedidos/:id */
  id = input.required<string>();

  readonly money = money;
  readonly shortDate = shortDate;
  readonly statusText = STATUS_TEXT;

  order = signal<OrderDetail | null>(null);
  loading = signal(true);
  error = signal('');
  busy = signal(false);

  isAdmin = computed(() => this.auth.role() === 'admin');
  /** Mismas reglas que el API */
  canEdit = computed(() => {
    const o = this.order();
    if (!o || o.status === 'anulado') return false;
    return this.isAdmin() || o.status === 'pendiente';
  });
  canConfirm = computed(() => this.isAdmin() && this.order()?.status === 'pendiente');

  constructor() {
    addIcons({ callOutline, copyOutline, locationOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.orders.get(Number(this.id())).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudo cargar el pedido.'));
        this.loading.set(false);
      },
    });
  }

  edit() {
    void this.nav.navigateForward(['/preventista/pedidos', this.id(), 'editar']);
  }

  async cancel() {
    const o = this.order();
    if (!o) return;
    const alert = await this.alerts.create({
      header: `Anular pedido #${o.id}`,
      message:
        o.status === 'confirmado'
          ? 'El pedido ya estaba confirmado: el stock de sus productos se devolverá.'
          : 'El pedido quedará anulado y no se podrá editar.',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Motivo (opcional)', attributes: { maxlength: 255 } }],
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Anular', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    const reason = String(data?.values?.reason ?? '').trim() || null;

    this.busy.set(true);
    this.orders.cancel(o.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        void this.toast.show('Pedido anulado', 'success');
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }

  async confirm() {
    const o = this.order();
    if (!o) return;
    const alert = await this.alerts.create({
      header: `Confirmar pedido #${o.id}`,
      message: `Se descontará el stock de ${o.items.length} producto(s). Total ${money(o.total)}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', role: 'confirm' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') return;

    this.busy.set(true);
    this.orders.confirm(o.id).subscribe({
      next: () => {
        this.busy.set(false);
        void this.toast.show('Pedido confirmado', 'success');
        this.load();
      },
      error: async (err) => {
        this.busy.set(false);
        const shortages = (err?.error?.shortages ?? []) as StockWarning[];
        if (err?.status === 409 && shortages.length > 0) {
          const a = await this.alerts.create({
            header: 'No hay stock suficiente',
            message:
              shortages.map((s) => `${s.name}: pide ${s.quantity}, hay ${s.stock}`).join('; ') +
              '. Ajusta el stock del producto o edita las cantidades del pedido.',
            buttons: ['Entendido'],
          });
          await a.present();
        } else {
          void this.toast.show(errorMessage(err), 'danger');
        }
      },
    });
  }

  /** Resumen en texto para mandarlo por WhatsApp */
  async copy() {
    const o = this.order();
    if (!o) return;
    const lines = o.items.map((i) => `• ${i.quantity} × ${i.product_name} — ${money(i.subtotal)}`);
    const text = [
      `Pedido #${o.id} — ${o.client_name}`,
      ...lines,
      o.discount_total > 0 ? `Ahorro: ${money(o.discount_total)}` : '',
      `TOTAL: ${money(o.total)}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      void this.toast.show('Resumen copiado', 'success');
    } catch {
      void this.toast.show('No se pudo copiar', 'danger');
    }
  }
}
