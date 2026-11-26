import { Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { errorMessage, money, shortDate } from '../../core/format';
import { Order, OrderStatus, OrdersService, STATUS_TEXT } from '../../core/orders.service';
import { PrevNavComponent } from '../nav/prev-nav.component';

type Filter = 'todos' | OrderStatus;

@Component({
  selector: 'app-prev-orders',
  templateUrl: 'orders.page.html',
  styleUrls: ['../prev-shared.scss', 'orders.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner,
    IonRefresher, IonRefresherContent, PrevNavComponent,
  ],
})
export class PrevOrdersPage {
  private orders = inject(OrdersService);
  private nav = inject(NavController);
  auth = inject(AuthService);

  readonly money = money;
  readonly shortDate = shortDate;
  readonly statusText = STATUS_TEXT;
  readonly filters: { key: Filter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'confirmado', label: 'Confirmados' },
    { key: 'anulado', label: 'Anulados' },
  ];

  items = signal<Order[]>([]);
  filter = signal<Filter>('todos');
  loading = signal(true);
  error = signal('');

  visible = computed(() => this.items().filter((o) => this.filter() === 'todos' || o.status === this.filter()));
  counts = computed(() => {
    const c: Record<Filter, number> = { todos: 0, pendiente: 0, confirmado: 0, anulado: 0 };
    for (const o of this.items()) {
      c.todos++;
      c[o.status]++;
    }
    return c;
  });
  /** Total de lo que no está anulado */
  sum = computed(() => this.visible().filter((o) => o.status !== 'anulado').reduce((s, o) => s + o.total, 0));

  ionViewWillEnter() {
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    this.orders.list().subscribe({
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

  open(o: Order) {
    void this.nav.navigateForward(['/preventista/pedidos', o.id]);
  }

  newOrder() {
    void this.nav.navigateForward('/preventista/pedidos/nuevo');
  }
}
