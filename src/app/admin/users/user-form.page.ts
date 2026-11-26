import { Component, computed, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AlertController,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { AuthService, Role } from '../../core/auth.service';
import { errorMessage } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { UserSummary, UsersService } from '../../core/users.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

@Component({
  selector: 'app-admin-user-form',
  templateUrl: 'user-form.page.html',
  styleUrls: ['../../preventista/prev-shared.scss', 'user-form.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSpinner],
})
export class AdminUserFormPage {
  private users = inject(UsersService);
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private alerts = inject(AlertController);
  private toast = inject(ToastService);

  /** /admin/usuarios/:id (no existe en /nuevo) */
  id = input<string>();

  current = signal<UserSummary | null>(null);
  loading = signal(false);
  loadError = signal('');
  saving = signal(false);
  submitted = signal(false);

  name = signal('');
  email = signal('');
  role = signal<Role>('preventista');
  zone = signal('');
  password = signal('');
  showPassword = signal(false);
  newPassword = signal('');

  isEdit = computed(() => !!this.id());
  /** El admin no puede quitarse el rol ni desactivarse a sí mismo */
  isSelf = computed(() => this.current()?.id === this.auth.user()?.id);

  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.name().trim()) e['name'] = 'El nombre es obligatorio.';
    if (!EMAIL_RE.test(this.email().trim())) e['email'] = 'Escribe un correo válido.';
    if (!this.isEdit() && this.password().length < MIN_PASSWORD) {
      e['password'] = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    }
    return e;
  });

  ionViewWillEnter() {
    this.submitted.set(false);
    this.password.set('');
    this.newPassword.set('');
    this.showPassword.set(false);
    const id = this.id() ? Number(this.id()) : null;
    if (!id) {
      this.current.set(null);
      this.fill(null);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    this.users.get(id).subscribe({
      next: (u) => {
        this.current.set(u);
        this.fill(u);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'No se pudo cargar el usuario.'));
        this.loading.set(false);
      },
    });
  }

  private fill(u: UserSummary | null) {
    this.name.set(u?.name ?? '');
    this.email.set(u?.email ?? '');
    this.role.set(u?.role ?? 'preventista');
    this.zone.set(u?.zone ?? '');
  }

  /** Clave sugerida fácil de dictar: 2 palabras + 2 números */
  suggest() {
    const words = ['sol', 'rio', 'mar', 'pan', 'luz', 'flor', 'cafe', 'mango', 'arroz', 'tienda'];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    const n = String(Math.floor(Math.random() * 90) + 10);
    const value = `${pick()}${pick()}${n}`;
    if (this.isEdit()) this.newPassword.set(value);
    else this.password.set(value);
    this.showPassword.set(true);
  }

  save() {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length > 0 || this.saving()) return;

    const body = {
      name: this.name().trim(),
      email: this.email().trim().toLowerCase(),
      role: this.role(),
      zone: this.zone().trim() || null,
    };
    this.saving.set(true);
    const u = this.current();
    const req: Observable<unknown> = u
      ? this.users.update(u.id, body)
      : this.users.create({ ...body, password: this.password() });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        void this.toast.show(u ? 'Usuario actualizado' : 'Usuario creado', 'success');
        void this.nav.navigateBack('/admin/usuarios');
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }

  changePassword() {
    const u = this.current();
    const pw = this.newPassword();
    if (!u || this.saving()) return;
    if (pw.length < MIN_PASSWORD) {
      void this.toast.show(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`, 'danger');
      return;
    }
    this.saving.set(true);
    this.users.setPassword(u.id, pw).subscribe({
      next: () => {
        this.saving.set(false);
        this.newPassword.set('');
        void this.toast.show('Contraseña actualizada. Entrégasela al usuario.', 'success');
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }

  async toggleActive() {
    const u = this.current();
    if (!u || this.saving()) return;
    if (u.is_active) {
      const extra =
        u.role === 'preventista' && (u.clients_count || u.pending_orders)
          ? ` Tiene ${u.clients_count ?? 0} cliente(s) y ${u.pending_orders ?? 0} pedido(s) pendiente(s): quedan guardados; reasigna los clientes en Clientes.`
          : '';
      const alert = await this.alerts.create({
        header: `Desactivar a ${u.name}`,
        message: `Su sesión se cerrará y no podrá volver a entrar.${extra}`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Desactivar', role: 'confirm' },
        ],
      });
      await alert.present();
      if ((await alert.onDidDismiss()).role !== 'confirm') return;
    }
    this.saving.set(true);
    this.users.toggle(u.id).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.current.set({ ...u, is_active: res.is_active });
        void this.toast.show(res.message, 'success');
      },
      error: (err) => {
        this.saving.set(false);
        void this.toast.show(errorMessage(err), 'danger');
      },
    });
  }
}
