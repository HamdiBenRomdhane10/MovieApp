import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

/** Composant racine : il ne contient que le conteneur Ionic et la zone où s'affichent les pages. */
@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class App {}
