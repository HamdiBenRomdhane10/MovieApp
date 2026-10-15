import { Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { film, heart, people, person, shieldCheckmark } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

/** Barre d'onglets en bas de l'écran. L'onglet "Admin" n'apparaît que pour les administrateurs. */
@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon name="film"></ion-icon>
          <ion-label>Films</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="favorites">
          <ion-icon name="heart"></ion-icon>
          <ion-label>Favoris</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="matches">
          <ion-icon name="people"></ion-icon>
          <ion-label>Matching</ion-label>
        </ion-tab-button>
        @if (auth.isAdmin()) {
          <ion-tab-button tab="admin">
            <ion-icon name="shield-checkmark"></ion-icon>
            <ion-label>Admin</ion-label>
          </ion-tab-button>
        }
        <ion-tab-button tab="profile">
          <ion-icon name="person"></ion-icon>
          <ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  readonly auth = inject(AuthService);

  constructor() {
    addIcons({ film, heart, people, person, shieldCheckmark });
  }
}
