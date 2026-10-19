import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { addIcons } from 'ionicons';
import { logoIonic } from 'ionicons/icons';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Enregistrement global de l'icône officielle Ionic
addIcons({ logoIonic, 'logo-ionic': logoIonic });

// Permet à la caméra Capacitor de fonctionner aussi dans le navigateur (webcam du PC).
// Sur un vrai téléphone, c'est la caméra native qui est utilisée.
defineCustomElements(window);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

