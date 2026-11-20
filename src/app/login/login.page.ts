import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [IonContent],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  canSubmit = computed(
    () => this.email().trim().length > 0 && this.password().length > 0 && !this.loading()
  );

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigateByUrl(this.auth.homeFor(res.user.role));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) this.error.set('Correo o contraseña incorrectos.');
        else if (err.status === 0)
          this.error.set('No se pudo conectar con el servidor. ¿Está encendido el API?');
        else this.error.set('Ocurrió un error. Intenta de nuevo.');
      },
    });
  }
}
