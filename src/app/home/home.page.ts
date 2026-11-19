import { Component, inject, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonSpinner,
} from '@ionic/angular';
import { ApiService, ApiStatus } from '../core/api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner],
})
export class HomePage {
  private api = inject(ApiService);

  loading = signal(false);
  state = signal<'idle' | 'ok' | 'error'>('idle');
  info = signal<ApiStatus | null>(null);
  errorMsg = signal('');

  constructor() {
    this.checkApi();
  }

  checkApi() {
    this.loading.set(true);
    this.state.set('idle');
    this.errorMsg.set('');

    this.api.health().subscribe({
      next: (res) => {
        this.info.set(res);
        this.state.set('ok');
        this.loading.set(false);
      },
      error: (err) => {
        this.info.set(null);
        this.state.set('error');
        this.errorMsg.set(
          err?.status === 0
            ? 'No se pudo conectar. ¿Está corriendo el API (npm start) en el puerto 3000?'
            : `El API respondió con error ${err?.status}`
        );
        this.loading.set(false);
      },
    });
  }
}
