import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import type { InfiniteScrollCustomEvent, SearchbarCustomEvent } from '@ionic/angular';
import {
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonIcon,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { Movie } from '../../models';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { NotifyService } from '../../services/notify.service';
import { errorMessage } from '../../utils/errors';

/**
 * Liste des films : films ajoutés par l'admin en premier, puis films populaires TMDB (ou résultats de recherche).
 * Le cœur ajoute / retire le film des favoris de l'utilisateur.
 */
@Component({
  selector: 'app-home',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSpinner, IonIcon,
    IonInfiniteScroll, IonInfiniteScrollContent, MovieCardComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private movies = inject(MovieService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);

  readonly list = signal<Movie[]>([]);
  readonly loading = signal(true);
  readonly hasMore = signal(false);
  readonly query = signal('');

  /** Ensemble des ids favoris, recalculé automatiquement quand l'utilisateur change. */
  readonly favorites = computed(() => new Set(this.auth.user()?.favorites ?? []));

  private page = 1;
  private requestId = 0; // pour ignorer les réponses périmées si l'utilisateur tape vite

  constructor() {
    addIcons({ searchOutline });
    // Charge la liste au démarrage ET chaque fois que l'admin ajoute / modifie / supprime un film
    effect(() => {
      this.movies.catalogVersion();
      untracked(() => void this.load(true));
    });
  }

  onSearch(ev: SearchbarCustomEvent) {
    this.query.set((ev.detail.value ?? '').trim());
    void this.load(true);
  }

  async loadMore(ev: InfiniteScrollCustomEvent) {
    this.page++;
    await this.load(false);
    await ev.target.complete();
  }

  private async load(reset: boolean) {
    const id = ++this.requestId;
    if (reset) {
      this.page = 1;
      this.loading.set(true);
    }
    const text = this.query();

    try {
      let items: Movie[] = [];

      if (reset) {
        // Films de l'admin (filtrés par le texte de recherche si besoin)
        try {
          const custom = await this.movies.customMovies();
          items = text ? custom.filter((m) => m.title.toLowerCase().includes(text.toLowerCase())) : custom;
        } catch {
          /* la collection peut être vide ou inaccessible : on continue avec TMDB */
        }
      }

      try {
        const res = text ? await this.movies.search(text, this.page) : await this.movies.popular(this.page);
        items = [...items, ...res.movies];
        if (id === this.requestId) this.hasMore.set(this.page < res.totalPages);
      } catch (e) {
        if (id === this.requestId) {
          this.hasMore.set(false);
          await this.notify.error('TMDB indisponible : vérifie ta clé API et ta connexion.');
        }
      }

      if (id !== this.requestId) return; // une recherche plus récente a pris le relais
      this.list.update((old) => (reset ? items : [...old, ...items]));
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  async toggle(movie: Movie) {
    const user = this.auth.user();
    if (!user) return;
    try {
      if (this.favorites().has(movie.id)) await this.movies.removeFavorite(user.uid, movie.id);
      else await this.movies.addFavorite(user.uid, movie.id);
      // Pas besoin de mettre à jour la liste à la main : AuthService écoute Firestore en temps réel.
    } catch (e) {
      await this.notify.error(errorMessage(e));
    }
  }
}
