import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, person } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { errorMessage } from '../../utils/errors';
import { shrinkImage } from '../../utils/image';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonButton, IonIcon, IonSpinner],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  readonly loading = signal(false);
  /** Photo prise avec la caméra (data URL), '' tant qu'aucune photo n'est prise. */
  readonly photo = signal('');

  readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    age: [18, [Validators.required, Validators.min(10), Validators.max(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({ camera, person });
  }

  /**
   * Ouvre la caméra (native sur téléphone, webcam dans le navigateur),
   * puis réduit l'image pour qu'elle tienne dans Firestore.
   */
  async takePhoto() {
    try {
      const shot = await Camera.getPhoto({
        quality: 80,
        width: 640,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
      });
      if (shot.dataUrl) this.photo.set(await shrinkImage(shot.dataUrl));
    } catch (e) {
      // Annuler la prise de photo n'est pas une erreur à afficher
      if (!/cancel/i.test(String((e as Error)?.message))) {
        await this.notify.error("Impossible d'utiliser la caméra. Vérifie l'autorisation.");
      }
    }
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.photo()) {
      await this.notify.error('Prends une photo de toi pour continuer.');
      return;
    }
    this.loading.set(true);
    try {
      const v = this.form.getRawValue();
      await this.auth.register({
        nom: v.nom.trim(),
        prenom: v.prenom.trim(),
        age: Number(v.age),
        email: v.email.trim(),
        password: v.password,
        photo: this.photo(),
      });
      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
