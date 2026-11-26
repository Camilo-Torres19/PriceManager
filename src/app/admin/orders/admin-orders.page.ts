import { Component, computed, inject, signal } from '@angular/core';
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
  NavController,
} from '@ionic/angular';
import { errorMessage, money, shortDate } from '../../core/format';
import { Order, OrderFilters, OrderStatus, OrdersService, STATUS_TEXT } from '../../core/orders.service';
import { todayStr } from '../../core/promo-utils';
import { UserSummary, UsersService } from '../../core/users.service';

type StatusFilter = 'todos' | OrderStatus;

/** AAAA-MM-DD de hace n días (hora local) */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-admin-orders',
  templateUrl: 'admin-orders.page.html',
  styleUrls: ['../../preventista/prev-shared.scss', 'admin-orders.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent,
    IonSpinner, IonRefresher, IonRefresherContent,
  ],
})
export class AdminOrdersPage {
  private orders = inject(OrdersService);
  private users = inject(UsersService);
  private nav = inject(NavController);

  readonly money = money;
  readonly shortDate = shortDate;
  readonly statusText = STATUS_TEXT;
  readonly statuses: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'confirmado', label: 'Confirmados' },
    { key: 'anulado', label: 'Anulados' },
  ];

  items = signal<Order[]>([]);
  preventistas = signal<UserSummary[]>([]);
  loading = signal(true);
  error = signal('');

  // Filtros (se aplican en el API)
  status = signal<StatusFilter>('pendiente');
  preventistaId = signal<number | null>(null);
  // Por defecto: TODOS los pendientes, sin importar la fecha (para no dejar ninguno sin confirmar)
  from = signal('');
  to = signal('');

  /** Totales de lo listado (sin contar anulados) */
  summary = computed(() => {
    const valid = this.items().filter((o) => o.status !== 'anulado');
    return { count: this.items().length, total: valid.reduce((s, o) => s + o.total, 0) };
  });

  ionViewWillEnter() {
    if (this.preventistas().length === 0) {
      this.users.list('preventista').subscribe({ next: (list) => this.preventistas.set(list) });
    }
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    const f: OrderFilters = {
      status: this.status() === 'todos' ? undefined : (this.status() as OrderStatus),
      preventista_id: this.preventistaId() ?? undefined,
      from: this.from() || undefined,
      to: this.to() || undefined,
    };
    this.orders.list(f).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
        done?.();
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar los pedidos.'));
        this.loading.set(false);
        done?.();
      },
    });
  }

  refresh(event: Event) {
    const target = event.target as HTMLIonRefresherElement;
    this.load(() => void target.complete());
  }

  setStatus(s: StatusFilter) {
    this.status.set(s);
    this.load();
  }

  setPreventista(value: string) {
    this.preventistaId.set(Number(value) || null);
    this.load();
  }

  setFrom(v: string) {
    this.from.set(v);
    this.load();
  }

  setTo(v: string) {
    this.to.set(v);
    this.load();
  }

  /** Atajos de fecha */
  range(days: number | null) {
    this.from.set(days === null ? '' : daysAgo(days));
    this.to.set(days === null ? '' : todayStr());
    this.load();
  }

  open(o: Order) {
    void this.nav.navigateForward(['/admin/pedidos', o.id]);
  }
}
