import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { money } from './format';
import { ToastService } from './toast.service';

/** Ventanita para cambiar un precio (la usan la lista y el formulario) */
@Injectable({ providedIn: 'root' })
export class PriceDialog {
  private alerts = inject(AlertController);
  private toast = inject(ToastService);

  async ask(name: string, current: number): Promise<{ price: number; reason: string } | null> {
    const alert = await this.alerts.create({
      header: 'Cambiar precio',
      subHeader: name,
      message: `Precio actual: ${money(current)}`,
      inputs: [
        { name: 'new_price', type: 'number', placeholder: 'Nuevo precio', min: 1, value: current },
        { name: 'reason', type: 'text', placeholder: 'Motivo (opcional)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          role: 'confirm',
          handler: (v) => {
            const n = Number(v?.new_price);
            if (!(n > 0)) {
              void this.toast.show('Escribe un precio mayor que cero', 'warning');
              return false;
            }
            if (n === current) {
              void this.toast.show('El precio es igual al actual', 'warning');
              return false;
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return null;
    return {
      price: Number(data.values.new_price),
      reason: String(data.values.reason ?? '').trim(),
    };
  }
}
