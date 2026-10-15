import { Component, inject } from '@angular/core';
import { AlertController, IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

/** Profil de l'utilisateur connecté + bouton de déconnexion. */
@Component({
  selector: 'app-profile',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage {
  readonly auth = inject(AuthService);
  private alerts = inject(AlertController);

  constructor() {
    addIcons({ logOutOutline });
  }

  async confirmLogout() {
    const alert = await this.alerts.create({
      header: 'Se déconnecter ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Se déconnecter', role: 'confirm', handler: () => void this.auth.logout() },
      ],
    });
    await alert.present();
  }
}
