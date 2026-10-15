/** Rôle d'un compte : "user" = utilisateur normal, "admin" = administrateur. */
export type Role = 'user' | 'admin';

/**
 * Un utilisateur, stocké dans Firestore : collection "users", document = uid Firebase Auth.
 * `favorites` contient les identifiants des films préférés (ex : "tmdb_550" ou l'id d'un film ajouté par l'admin).
 */
export interface AppUser {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  age: number;
  photo: string; // image JPEG encodée en base64 (data URL), prise avec la caméra
  role: Role;
  active: boolean; // false = compte désactivé (jamais supprimé)
  favorites: string[];
}

/** Un film, qu'il vienne de TMDB ou de la collection Firestore "movies" (ajouté par l'admin). */
export interface Movie {
  id: string;
  title: string;
  overview: string;
  poster: string; // URL de l'affiche ('' si aucune)
  year?: string;
  rating?: number; // note sur 10 (TMDB uniquement)
  custom?: boolean; // true = ajouté par l'admin
}

/** Résultat du matching pour un autre utilisateur. */
export interface MatchResult {
  user: AppUser;
  score: number; // entre 0 et 1
  common: string[]; // ids des films en commun
}
