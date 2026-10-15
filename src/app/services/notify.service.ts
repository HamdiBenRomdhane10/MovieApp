import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Petit utilitaire pour afficher des messages (toasts) en bas de l'écran. */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private toast = inject(ToastController);

  success(message: string) {
    return this.show(message, 'success');
  }

  error(message: string) {
    return this.show(message, 'danger');
  }

  private async show(message: string, color: 'success' | 'danger') {
    const t = await this.toast.create({ message, color, duration: 2800, position: 'bottom' });
    await t.present();
  }
}
