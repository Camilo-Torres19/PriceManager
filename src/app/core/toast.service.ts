import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = inject(ToastController);

  async show(message: string, color: 'success' | 'warning' | 'danger' | 'dark' = 'dark') {
    const toast = await this.toasts.create({ message, duration: 2400, color, position: 'bottom' });
    await toast.present();
  }
}
