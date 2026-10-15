import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { errorMessage } from '../../utils/errors';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonButton, IonSpinner],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  readonly loading = signal(false);

  /** Formulaire réactif : chaque champ a ses règles de validation. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email.trim(), password);
      // L'admin arrive directement sur son espace, l'utilisateur sur la liste de films
      await this.router.navigateByUrl(this.auth.isAdmin() ? '/tabs/admin' : '/tabs/home', { replaceUrl: true });
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
