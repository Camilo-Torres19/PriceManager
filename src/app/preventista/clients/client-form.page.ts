import { Component, computed, inject, input, signal } from '@angular/core';
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
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Client, ClientInput, ClientsService } from '../../core/clients.service';
import { errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-prev-client-form',
  templateUrl: 'client-form.page.html',
  styleUrls: ['../prev-shared.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSpinner],
})
export class PrevClientFormPage {
  private clients = inject(ClientsService);
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  /** Viene de /preventista/clientes/:id (no existe en /nuevo) */
  id = input<string>();

  current = signal<Client | null>(null);
  loading = signal(false);
  loadError = signal('');
  saving = signal(false);
  submitted = signal(false);

  name = signal('');
  contactName = signal('');
  nit = signal('');
  address = signal('');
  phone = signal('');
  zone = signal('');
  notes = signal('');

  isEdit = computed(() => !!this.id());

  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.name().trim()) e['name'] = 'El nombre del negocio es obligatorio.';
    if (this.phone().trim() && !/^[0-9+()\s-]{7,20}$/.test(this.phone().trim())) {
      e['phone'] = 'Escribe un teléfono válido (solo números).';
    }
    return e;
  });

  ionViewWillEnter() {
    this.submitted.set(false);
    const id = this.id() ? Number(this.id()) : null;
    if (!id) {
      this.current.set(null);
      this.fill(null);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.clients.get(id).subscribe({
      next: (c) => {
        this.current.set(c);
        this.fill(c);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'No se pudo cargar el cliente.'));
        this.loading.set(false);
      },
    });
  }

  private fill(c: Client | null) {
    this.name.set(c?.name ?? '');
    this.contactName.set(c?.contact_name ?? '');
    this.nit.set(c?.nit ?? '');
    this.address.set(c?.address ?? '');
    this.phone.set(c?.phone ?? '');
    // Cliente nuevo: por defecto, la zona del preventista
    this.zone.set(c ? (c.zone ?? '') : (this.auth.user()?.zone ?? ''));
    this.notes.set(c?.notes ?? '');
  }

  save() {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0 || this.saving()) return;

    const body: ClientInput = {
      name: this.name().trim(),
      contact_name: this.contactName().trim() || null,
      nit: this.nit().trim() || null,
      address: this.address().trim() || null,
      phone: this.phone().trim() || null,
      zone: this.zone().trim() || null,
      notes: this.notes().trim() || null,
      // El admin conserva la asignación que ya tenía el cliente
      preventista_id: this.current()?.preventista_id ?? null,
    };

    this.saving.set(true);
    const c = this.current();
    const req = c ? this.clients.update(c.id, body) : this.clients.create(body);
    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        void this.toast.show(c ? 'Cliente actualizado' : 'Cliente creado', 'success');
        // Si venía de "Nuevo pedido", vuelve allá con el cliente ya elegido
        const back = this.route.snapshot.queryParamMap.get('volver');
        if (!c && back === 'pedido' && 'id' in res) {
          void this.nav.navigateBack('/preventista/pedidos/nuevo', { queryParams: { cliente: res.id } });
        } else {
          void this.nav.navigateBack('/preventista/clientes');
        }
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }
}
