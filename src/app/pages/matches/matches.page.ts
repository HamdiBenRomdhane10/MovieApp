import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RefresherCustomEvent } from '@ionic/angular';
import {
  IonButton, IonContent, IonHeader, IonIcon, IonProgressBar, IonRefresher, IonRefresherContent,
  IonSpinner, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartOutline, peopleOutline } from 'ionicons/icons';
import { MatchResult } from '../../models';
import { AuthService } from '../../services/auth.service';
import { MATCH_THRESHOLD, MatchService } from '../../services/match.service';
import { MovieService } from '../../services/movie.service';
import { NotifyService } from '../../services/notify.service';
import { errorMessage } from '../../utils/errors';

/**
 * Matching : montre les utilisateurs dont la liste de favoris correspond à plus de 75 % à la tienne.
 * Les résultats sont recalculés à chaque fois qu'on ouvre l'onglet (ionViewWillEnter) ou qu'on tire pour rafraîchir.
 */
@Component({
  selector: 'app-matches',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonIcon, IonButton,
    IonProgressBar, IonRefresher, IonRefresherContent, RouterLink,
  ],
  templateUrl: './matches.page.html',
  styleUrl: './matches.page.scss',
})
export class MatchesPage {
  readonly auth = inject(AuthService);
  private matcher = inject(MatchService);
  private movies = inject(MovieService);
  private notify = inject(NotifyService);

  readonly threshold = Math.round(MATCH_THRESHOLD * 100);
  readonly matches = signal<MatchResult[]>([]);
  readonly compared = signal(0);
  readonly loading = signal(true);
  /** id du film → titre, pour afficher les films en commun. */
  readonly titles = signal<Record<string, string>>({});

  constructor() {
    addIcons({ heartOutline, peopleOutline });
  }

  /** Méthode appelée automatiquement par Ionic chaque fois que l'onglet devient visible. */
  ionViewWillEnter() {
    void this.refresh();
  }

  async onRefresh(ev: RefresherCustomEvent) {
    await this.refresh();
    await ev.target.complete();
  }

  percent(score: number): number {
    return Math.round(score * 100);
  }

  commonTitles(m: MatchResult): string[] {
    const t = this.titles();
    return m.common.map((id) => t[id]).filter(Boolean);
  }

  private async refresh() {
    const me = this.auth.user();
    if (!me) return;
    try {
      const { matches, compared } = await this.matcher.findMatches(me);
      this.matches.set(matches);
      this.compared.set(compared);

      // Récupère les titres des films en commun pour les afficher
      const ids = [...new Set(matches.flatMap((m) => m.common))];
      const movies = await this.movies.getMany(ids);
      this.titles.set(Object.fromEntries(movies.map((m) => [m.id, m.title])));
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
