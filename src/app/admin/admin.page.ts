import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, RouterLink],
})
export class AdminPage {
  auth = inject(AuthService);
}
