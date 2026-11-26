import { Component, computed, inject, signal } from '@angular/core';
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
  NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, callOutline, cartOutline, locationOutline, searchOutline } from 'ionicons/icons';
import { Client, ClientsService } from '../../core/clients.service';
import { errorMessage } from '../../core/format';
import { PrevNavComponent } from '../nav/prev-nav.component';

@Component({
  selector: 'app-prev-clients',
  templateUrl: 'clients.page.html',
  styleUrls: ['../prev-shared.scss', 'clients.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
    IonSpinner, IonRefresher, IonRefresherContent, PrevNavComponent,
  ],
})
export class PrevClientsPage {
  private clients = inject(ClientsService);
  private nav = inject(NavController);

  items = signal<Client[]>([]);
  search = signal('');
  loading = signal(true);
  error = signal('');

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.items().filter(
      (c) =>
        !q ||
        [c.name, c.contact_name ?? '', c.address ?? '', c.nit ?? '', c.phone ?? ''].some((t) =>
          t.toLowerCase().includes(q)
        )
    );
  });

  constructor() {
    addIcons({ addOutline, callOutline, cartOutline, locationOutline, searchOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    this.clients.list().subscribe({
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

  add() {
    void this.nav.navigateForward('/preventista/clientes/nuevo');
  }

  edit(c: Client) {
    void this.nav.navigateForward(['/preventista/clientes', c.id]);
  }

  /** Atajo: tomar pedido a este cliente */
  order(c: Client, event: Event) {
    event.stopPropagation();
    void this.nav.navigateForward('/preventista/pedidos/nuevo', { queryParams: { cliente: c.id } });
  }
}
