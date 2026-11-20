import { Component, inject } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-preventista',
  templateUrl: 'preventista.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
})
export class PreventistaPage {
  auth = inject(AuthService);
}
