import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { db } from '../firebase';
import { Movie } from '../models';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
}
interface TmdbPage {
  results: TmdbMovie[];
  total_pages: number;
}

/** Les 4 champs d'un film ajouté par l'admin (tous obligatoires). */
export interface MovieInput {
  title: string;
  overview: string;
  poster: string;
  year: string;
}

export interface MoviePage {
  movies: Movie[];
  totalPages: number;
}

/**
 * Tout ce qui concerne les films :
 *  - lecture depuis l'API TMDB (films populaires, recherche, détail d'un film),
 *  - films ajoutés par l'admin (collection Firestore "movies"),
 *  - ajout / retrait d'un film dans les favoris d'un utilisateur.
 *
 * Identifiants : "tmdb_<numéro>" pour TMDB, l'id du document Firestore pour un film ajouté par l'admin.
 */
@Injectable({ providedIn: 'root' })
export class MovieService {
  private http = inject(HttpClient);
  private readonly api = 'https://api.themoviedb.org/3';
  /** Mémoire des films déjà chargés, pour éviter de rappeler l'API. */
  private cache = new Map<string, Movie>();
  /**
   * Numéro de version du catalogue de l'admin : il augmente à chaque ajout / modification / suppression.
   * Les pages Films et Favoris l'observent pour se recharger toutes seules.
   */
  readonly catalogVersion = signal(0);

  // ---------- TMDB ----------

  popular(page = 1): Promise<MoviePage> {
    return this.fetchPage('/movie/popular', page);
  }

  search(text: string, page = 1): Promise<MoviePage> {
    return this.fetchPage('/search/movie', page, `&query=${encodeURIComponent(text)}`);
  }

  private async fetchPage(path: string, page: number, extra = ''): Promise<MoviePage> {
    const data = await firstValueFrom(
      this.http.get<TmdbPage>(`${this.api}${path}?${this.params()}&page=${page}${extra}`),
    );
    const movies = data.results.map((m) => this.fromTmdb(m));
    this.remember(movies);
    return { movies, totalPages: data.total_pages };
  }

  private params(): string {
    return `api_key=${environment.tmdbApiKey}&language=fr-FR`;
  }

  private fromTmdb(m: TmdbMovie): Movie {
    return {
      id: 'tmdb_' + m.id,
      title: m.title,
      overview: m.overview,
      poster: m.poster_path ? 'https://image.tmdb.org/t/p/w342' + m.poster_path : '',
      year: m.release_date?.slice(0, 4) || undefined,
      rating: m.vote_average || undefined,
    };
  }

  // ---------- Films de l'admin (Firestore) ----------

  async customMovies(): Promise<Movie[]> {
    const snap = await getDocs(query(collection(db, 'movies'), orderBy('createdAt', 'desc')));
    const movies = snap.docs.map((d) => ({ ...(d.data() as Movie), id: d.id, custom: true }));
    this.remember(movies);
    return movies;
  }

  /** CRUD — Create : ajoute un film au catalogue. */
  async addMovie(m: MovieInput): Promise<void> {
    await addDoc(collection(db, 'movies'), { ...m, createdAt: Date.now() });
    this.catalogVersion.update((v) => v + 1);
  }

  /** CRUD — Update : modifie un film existant. */
  async updateMovie(id: string, m: MovieInput): Promise<void> {
    await updateDoc(doc(db, 'movies', id), { ...m });
    this.cache.delete(id);
    this.catalogVersion.update((v) => v + 1);
  }

  /** CRUD — Delete : supprime un film du catalogue. */
  async deleteMovie(id: string): Promise<void> {
    await deleteDoc(doc(db, 'movies', id));
    this.cache.delete(id);
    this.catalogVersion.update((v) => v + 1);
  }

  // ---------- Retrouver des films à partir de leurs ids (pour afficher les favoris) ----------

  async getMovie(id: string): Promise<Movie | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    let movie: Movie | null = null;
    if (id.startsWith('tmdb_')) {
      const t = await firstValueFrom(
        this.http.get<TmdbMovie>(`${this.api}/movie/${id.slice(5)}?${this.params()}`),
      );
      movie = this.fromTmdb(t);
    } else {
      const snap = await getDoc(doc(db, 'movies', id));
      if (snap.exists()) movie = { ...(snap.data() as Movie), id: snap.id, custom: true };
    }
    if (movie) this.cache.set(id, movie);
    return movie;
  }

  /** Charge plusieurs films en parallèle ; ceux qui échouent (film introuvable) sont ignorés. */
  async getMany(ids: string[]): Promise<Movie[]> {
    const results = await Promise.allSettled(ids.map((id) => this.getMovie(id)));
    return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
  }

  // ---------- Favoris ----------

  addFavorite(uid: string, movieId: string) {
    return updateDoc(doc(db, 'users', uid), { favorites: arrayUnion(movieId) });
  }

  removeFavorite(uid: string, movieId: string) {
    return updateDoc(doc(db, 'users', uid), { favorites: arrayRemove(movieId) });
  }

  private remember(movies: Movie[]) {
    movies.forEach((m) => this.cache.set(m.id, m));
  }
}
