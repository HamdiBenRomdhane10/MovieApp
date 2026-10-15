import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartOutline } from 'ionicons/icons';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { Movie } from '../../models';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { NotifyService } from '../../services/notify.service';
import { errorMessage } from '../../utils/errors';

/** La playlist personnelle de l'utilisateur : tous les films qu'il a mis en favoris. */
@Component({
  selector: 'app-favorites',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonIcon, IonButton, RouterLink, MovieCardComponent],
  templateUrl: './favorites.page.html',
  styleUrl: './favorites.page.scss',
})
export class FavoritesPage {
  readonly auth = inject(AuthService);
  private movies = inject(MovieService);
  private notify = inject(NotifyService);

  readonly list = signal<Movie[]>([]);
  readonly loading = signal(true);
  private requestId = 0;

  constructor() {
    addIcons({ heartOutline });
    // Se relance automatiquement dès que la liste des favoris de l'utilisateur change
    effect(() => {
      const ids = this.auth.user()?.favorites ?? [];
      this.movies.catalogVersion(); // se recharge aussi quand l'admin modifie ou supprime un film
      untracked(() => void this.resolve(ids));
    });
  }

  private async resolve(ids: string[]) {
    const id = ++this.requestId;
    try {
      // Les derniers films ajoutés apparaissent en premier
      const movies = await this.movies.getMany([...ids].reverse());
      if (id === this.requestId) this.list.set(movies);
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  async remove(movie: Movie) {
    const user = this.auth.user();
    if (!user) return;
    try {
      await this.movies.removeFavorite(user.uid, movie.id);
    } catch (e) {
      await this.notify.error(errorMessage(e));
    }
  }
}
