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
import { addOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/format';
import { UserSummary, UsersService } from '../../core/users.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: 'users.page.html',
  styleUrls: ['../../preventista/prev-shared.scss', 'users.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon,
    IonContent, IonSpinner, IonRefresher, IonRefresherContent,
  ],
})
export class AdminUsersPage {
  private users = inject(UsersService);
  private nav = inject(NavController);
  auth = inject(AuthService);

  items = signal<UserSummary[]>([]);
  loading = signal(true);
  error = signal('');
  showInactive = signal(false);

  visible = computed(() => this.items().filter((u) => this.showInactive() || u.is_active));
  inactiveCount = computed(() => this.items().filter((u) => !u.is_active).length);

  constructor() {
    addIcons({ addOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  load(done?: () => void) {
    if (!done) this.loading.set(true);
    this.error.set('');
    this.users.list().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
        done?.();
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar los usuarios.'));
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
    void this.nav.navigateForward('/admin/usuarios/nuevo');
  }

  edit(u: UserSummary) {
    void this.nav.navigateForward(['/admin/usuarios', u.id]);
  }
}
