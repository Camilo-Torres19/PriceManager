import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
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
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline } from 'ionicons/icons';
import { Client, ClientsService } from '../../core/clients.service';
import { errorMessage } from '../../core/format';
import { UserSummary, UsersService } from '../../core/users.service';

@Component({
  selector: 'app-admin-clients',
  templateUrl: 'admin-clients.page.html',
  styleUrls: ['../../preventista/prev-shared.scss', 'admin-clients.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon,
    IonContent, IonSpinner, IonRefresher, IonRefresherContent,
  ],
})
export class AdminClientsPage {
  private clients = inject(ClientsService);
  private users = inject(UsersService);
  private nav = inject(NavController);

  items = signal<Client[]>([]);
  preventistas = signal<UserSummary[]>([]);
  loading = signal(true);
  error = signal('');

  search = signal('');
  /** null = todos · 0 = sin asignar · n = ese preventista */
  preventistaId = signal<number | null>(null);
  showInactive = signal(false);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const pid = this.preventistaId();
    return this.items().filter(
      (c) =>
        (this.showInactive() || c.is_active) &&
        (pid === null || (pid === 0 ? c.preventista_id === null : c.preventista_id === pid)) &&
        (!q ||
          [c.name, c.contact_name ?? '', c.address ?? '', c.nit ?? '', c.phone ?? ''].some((t) =>
            t.toLowerCase().includes(q)
          ))
    );
  });

  unassigned = computed(() => this.items().filter((c) => c.is_active && c.preventista_id === null).length);

  constructor() {
    addIcons({ addOutline, searchOutline });
  }

  ionViewWillEnter() {
    if (this.preventistas().length === 0) {
      this.users.list('preventista').subscribe({ next: (list) => this.preventistas.set(list) });
    }
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    this.clients.list({ include_inactive: true }).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
        done?.();
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar los clientes.'));
        this.loading.set(false);
        done?.();
      },
    });
  }

  refresh(event: Event) {
    const target = event.target as HTMLIonRefresherElement;
    this.load(() => void target.complete());
  }

  setPreventista(value: string) {
    this.preventistaId.set(value === '' ? null : Number(value));
  }

  add() {
    void this.nav.navigateForward('/admin/clientes/nuevo');
  }

  edit(c: Client) {
    void this.nav.navigateForward(['/admin/clientes', c.id]);
  }
}
