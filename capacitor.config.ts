import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tn.tekup.movieapp',
  appName: 'MovieApp',
  // Dossier produit par "npm run build" que Capacitor copie dans l'application Android
  webDir: 'dist/movieApp/browser',
};

export default config;
