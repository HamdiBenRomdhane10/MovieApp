import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { film, heart, heartOutline, star } from 'ionicons/icons';
import { Movie } from '../../models';

/**
 * Carte d'un film (affiche, titre, année, note, résumé) avec un bouton "favori".
 * Utilisée par les pages Films, Favoris et Admin.
 *
 *  - `movie`          : le film à afficher (obligatoire)
 *  - `favorite`       : true si le film est dans les favoris de l'utilisateur
 *  - `showFavorite`   : false pour masquer le bouton cœur (page admin)
 *  - `toggleFavorite` : événement émis quand on clique sur le cœur
 */
@Component({
  selector: 'app-movie-card',
  imports: [IonButton, IonIcon],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.scss',
})
export class MovieCardComponent {
  readonly movie = input.required<Movie>();
  readonly favorite = input(false);
  readonly showFavorite = input(true);
  readonly toggleFavorite = output<Movie>();

  constructor() {
    addIcons({ film, heart, heartOutline, star });
  }
}
