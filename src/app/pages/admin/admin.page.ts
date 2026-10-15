import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { SegmentCustomEvent } from '@ionic/angular';
import {
  AlertController, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList,
  IonSegment, IonSegmentButton, IonSpinner, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';
import { AppUser, Movie } from '../../models';
import { MovieService } from '../../services/movie.service';
import { NotifyService } from '../../services/notify.service';
import { UserService } from '../../services/user.service';
import { errorMessage } from '../../utils/errors';

/**
 * Espace administrateur (réservé par adminGuard) :
 *  - CRUD des films du catalogue (collection Firestore "movies") : ajouter, modifier, supprimer ;
 *  - désactiver / réactiver des utilisateurs (champ `active`, aucun compte n'est supprimé).
 */
@Component({
  selector: 'app-admin',
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton,
    IonLabel, IonInput, IonTextarea, IonButton, IonIcon, IonSpinner, IonList, IonItem, MovieCardComponent,
  ],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
})
export class AdminPage {
  private fb = inject(FormBuilder);
  private movies = inject(MovieService);
  private users = inject(UserService);
  private notify = inject(NotifyService);
  private alerts = inject(AlertController);
  private content = viewChild(IonContent);

  readonly segment = signal<'films' | 'users'>('films');
  readonly customMovies = signal<Movie[]>([]);
  readonly userList = signal<AppUser[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  /** id du film en cours de modification (null = on est en mode "ajout"). */
  readonly editingId = signal<string | null>(null);
  /** uid de l'utilisateur dont on modifie le statut (pour bloquer le bouton pendant l'enregistrement) */
  readonly busyUid = signal('');
  readonly inactiveCount = computed(() => this.userList().filter((u) => !u.active).length);

  /** Les 4 champs sont tous obligatoires. */
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    year: ['', [Validators.required, Validators.pattern(/^(19|20)\d{2}$/)]],
    poster: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
    overview: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    addIcons({ createOutline, trashOutline });
  }

  ionViewWillEnter() {
    void this.reload();
  }

  onSegment(ev: SegmentCustomEvent) {
    this.segment.set(ev.detail.value === 'users' ? 'users' : 'films');
  }

  // ---------- CRUD des films ----------

  /** Ajoute un nouveau film, ou enregistre les modifications si on est en mode édition. */
  async saveMovie() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.notify.error('Tous les champs sont obligatoires.');
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const data = {
        title: v.title.trim(),
        year: v.year.trim(),
        poster: v.poster.trim(),
        overview: v.overview.trim(),
      };
      const id = this.editingId();
      if (id) await this.movies.updateMovie(id, data);
      else await this.movies.addMovie(data);

      await this.notify.success(id ? 'Film modifié' : 'Film ajouté');
      this.cancelEdit();
      this.customMovies.set(await this.movies.customMovies());
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  /** Remplit le formulaire avec le film choisi et passe en mode "modification". */
  startEdit(movie: Movie) {
    this.editingId.set(movie.id);
    this.form.reset({
      title: movie.title,
      year: movie.year ?? '',
      poster: movie.poster,
      overview: movie.overview,
    });
    void this.content()?.scrollToTop(300);
  }

  /** Quitte le mode modification et vide le formulaire. */
  cancelEdit() {
    this.editingId.set(null);
    this.form.reset();
  }

  async confirmDelete(movie: Movie) {
    const alert = await this.alerts.create({
      header: 'Supprimer ce film ?',
      message: `« ${movie.title} » sera supprimé définitivement du catalogue.`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Supprimer', role: 'destructive', handler: () => void this.deleteMovie(movie) },
      ],
    });
    await alert.present();
  }

  private async deleteMovie(movie: Movie) {
    try {
      await this.movies.deleteMovie(movie.id);
      if (this.editingId() === movie.id) this.cancelEdit();
      this.customMovies.update((list) => list.filter((m) => m.id !== movie.id));
      await this.notify.success('Film supprimé');
    } catch (e) {
      await this.notify.error(errorMessage(e));
    }
  }

  // ---------- Utilisateurs ----------

  /** Désactive (active = false) ou réactive (active = true) un compte. Le compte n'est jamais supprimé. */
  async setActive(user: AppUser, active: boolean) {
    this.busyUid.set(user.uid);
    try {
      await this.users.setActive(user.uid, active);
      this.userList.update((list) => list.map((u) => (u.uid === user.uid ? { ...u, active } : u)));
      await this.notify.success(active ? 'Compte réactivé' : 'Compte désactivé');
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.busyUid.set('');
    }
  }

  private async reload() {
    try {
      const [movies, users] = await Promise.all([this.movies.customMovies(), this.users.listUsers()]);
      this.customMovies.set(movies);
      this.userList.set(users);
    } catch (e) {
      await this.notify.error(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
