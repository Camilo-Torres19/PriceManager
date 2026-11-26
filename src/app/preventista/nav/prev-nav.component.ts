import { Component, inject, input } from '@angular/core';
import { IonFooter, IonIcon, IonToolbar, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircle, peopleOutline, pricetagsOutline, receiptOutline } from 'ionicons/icons';

export type PrevTab = 'catalogo' | 'clientes' | 'pedidos';

/** Barra inferior del preventista: Catálogo · + Pedido · Clientes · Pedidos */
@Component({
  selector: 'app-prev-nav',
  imports: [IonFooter, IonToolbar, IonIcon],
  template: `
    <ion-footer>
      <ion-toolbar>
        <nav class="nav">
          <button type="button" [class.on]="active() === 'catalogo'" (click)="go('/preventista')">
            <ion-icon name="pricetags-outline"></ion-icon><span>Catálogo</span>
          </button>
          <button type="button" [class.on]="active() === 'clientes'" (click)="go('/preventista/clientes')">
            <ion-icon name="people-outline"></ion-icon><span>Clientes</span>
          </button>
          <button type="button" [class.on]="active() === 'pedidos'" (click)="go('/preventista/pedidos')">
            <ion-icon name="receipt-outline"></ion-icon><span>Pedidos</span>
          </button>
          <button type="button" class="new" (click)="newOrder()">
            <ion-icon name="add-circle"></ion-icon><span>Nuevo pedido</span>
          </button>
        </nav>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    ion-toolbar { --background: #fff; --border-color: #e6eaf0; --padding-top: 0; --padding-bottom: 0; }
    .nav { display: flex; }
    .nav button {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
      border: 0; background: transparent; padding: 8px 2px; font-size: 11px; font-weight: 600;
      color: #6b7788; cursor: pointer;
    }
    .nav ion-icon { font-size: 22px; }
    .nav button.on { color: #1a3a6b; }
    .nav button.new { color: #2e7d32; font-weight: 800; }
  `],
})
export class PrevNavComponent {
  private nav = inject(NavController);
  active = input<PrevTab | null>(null);

  constructor() {
    addIcons({ addCircle, peopleOutline, pricetagsOutline, receiptOutline });
  }

  /** Las pestañas reemplazan la pila (el botón atrás no va saltando entre ellas) */
  go(url: string) {
    void this.nav.navigateRoot(url, { animated: false });
  }

  newOrder() {
    void this.nav.navigateForward('/preventista/pedidos/nuevo');
  }
}
