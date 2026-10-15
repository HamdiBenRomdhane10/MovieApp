# Comment fonctionne MovieApp (explications détaillées)

## 1. Les technologies et pourquoi

| Brique | Rôle |
|---|---|
| **Angular 22** | Framework : composants, routage, formulaires, services. |
| **Ionic 9** | Composants mobiles prêts à l'emploi (`ion-button`, `ion-tabs`, `ion-toggle`…) et navigation de type application. |
| **Capacitor 8** | Pont entre le code web et le téléphone : donne accès à la caméra native et permet de produire une app Android/iOS. |
| **Firebase Auth** | Création de compte et connexion par email / mot de passe. |
| **Firestore** | Base de données NoSQL (collections et documents). |
| **TMDB** | API publique de films (point de départ du catalogue). |

> On utilise le SDK `firebase` directement et non `@angular/fire` : cette surcouche ne supporte pas encore Angular 22.

## 2. Architecture du code

```
src/
├── environments/environment.ts   ← clés TMDB + config Firebase (à remplir)
├── main.ts                       ← démarre l'app (+ caméra pour le navigateur)
├── styles.scss                   ← thème (couleurs) global
└── app/
    ├── app.ts / app.config.ts    ← composant racine + services globaux (Ionic, HTTP, routeur)
    ├── app.routes.ts             ← les URLs de l'app et leurs protections (guards)
    ├── firebase.ts               ← initialise Firebase (auth + db)
    ├── models.ts                 ← les types : AppUser, Movie, MatchResult
    ├── services/                 ← la logique métier (pas d'affichage)
    │   ├── auth.service.ts       ← inscription, connexion, utilisateur courant
    │   ├── movie.service.ts      ← TMDB, films de l'admin, favoris
    │   ├── match.service.ts      ← calcul du matching
    │   ├── user.service.ts       ← liste / désactivation des utilisateurs (admin)
    │   └── notify.service.ts     ← messages (toasts)
    ├── guards/                   ← protègent les pages
    ├── components/movie-card/    ← carte de film réutilisable
    ├── utils/                    ← messages d'erreur FR, réduction d'image
    └── pages/                    ← login, register, tabs, home, favorites, matches, profile, admin
```

Chaque page = un composant (`.ts` logique, `.html` affichage, `.scss` style).
**Règle d'or :** les pages n'appellent jamais Firebase directement, elles passent par les services.

## 3. Navigation

```
/login ──┐ (guestGuard : réservé aux non connectés)
/register┘

/tabs  (authGuard : il faut être connecté ET actif)
  ├── /tabs/home       Films
  ├── /tabs/favorites  Favoris
  ├── /tabs/matches    Matching
  ├── /tabs/admin      Admin   (adminGuard : role === 'admin')
  └── /tabs/profile    Profil
```

Un **guard** est une fonction exécutée avant d'ouvrir une page. Elle attend que Firebase ait retrouvé la session (`auth.restore()`), puis autorise ou redirige. Les pages sont chargées à la demande (`loadComponent`), ce qui allège le démarrage.

> Détail technique : dans un guard, `inject()` doit être appelé **avant** le premier `await`, sinon Angular lève l'erreur NG0203. C'est pourquoi `inject(Router)` est en haut de chaque guard.

## 4. Les données (Firestore)

### Collection `users` — un document par utilisateur (id = uid Firebase)
```json
{
  "uid": "abc123", "email": "ali@mail.com",
  "nom": "Ben Salah", "prenom": "Ali", "age": 21,
  "photo": "data:image/jpeg;base64,/9j/4AAQ…",
  "role": "user",            // "user" ou "admin"
  "active": true,            // false = compte désactivé
  "favorites": ["tmdb_550", "tmdb_680", "Zk3fA9…"]
}
```
### Collection `movies` — films ajoutés par l'admin
```json
{ "title": "Mon film", "year": "2024", "poster": "https://…", "overview": "…", "createdAt": 1760000000000 }
```

**Identifiants de films :** `tmdb_<numéro>` pour un film TMDB, ou l'id du document Firestore pour un film de l'admin. Les favoris sont simplement une liste de ces ids : on ne copie pas les films, on les retrouve à l'affichage (`MovieService.getMany`).

**Photo :** la caméra donne une image que l'on réduit à 320 px (JPEG) avec `shrinkImage`, soit ~30 Ko, stockée en base64 dans le document. Pas besoin de Firebase Storage. Limite d'un document Firestore : 1 Mo.

## 5. Parcours principaux

### Inscription (`register.page.ts` → `AuthService.register`)
1. Bouton « Prendre une photo » → `Camera.getPhoto()` (Capacitor) ouvre la caméra. Dans le navigateur, le paquet `@ionic/pwa-elements` fournit une interface webcam.
2. L'image est réduite par `shrinkImage`.
3. Le formulaire est validé (champs obligatoires, email valide, mot de passe ≥ 6, âge entre 10 et 120).
4. `createUserWithEmailAndPassword` crée le compte d'authentification.
5. `setDoc` écrit le profil dans `users/<uid>` avec `role: 'user'`, `active: true`, `favorites: []`.
   Si cette écriture échoue, le compte d'authentification est supprimé (`deleteUser`) pour ne pas laisser de compte sans profil.

### Connexion (`AuthService.login`)
1. `signInWithEmailAndPassword`.
2. On lit `users/<uid>`. **Si `active` est faux → on se déconnecte aussitôt** et on affiche « compte désactivé ».
3. Sinon, on garde le profil dans un *signal* et on écoute le document en temps réel avec `onSnapshot`.

### Pourquoi un « signal » et `onSnapshot` ?
`AuthService.user` est un **signal** : une valeur observable. Les pages qui l'appellent (`auth.user()`) se redessinent seules quand elle change. Combiné à `onSnapshot` :
- quand tu cliques sur un cœur, Firestore met à jour `favorites`, le signal change et **toutes** les pages se mettent à jour (cœur plein, onglet Favoris, compteur du profil) sans code supplémentaire ;
- si un admin désactive le compte pendant que la personne utilise l'app, `onSnapshot` le détecte et la déconnecte immédiatement.

### Films et favoris (`home`, `favorites`)
- `MovieService.popular(page)` / `search(texte, page)` appellent TMDB avec `HttpClient`.
- La page Films affiche d'abord les films de l'admin (`customMovies`) puis ceux de TMDB. Le défilement infini charge la page suivante.
- Un compteur `requestId` ignore les réponses obsolètes quand l'utilisateur tape vite dans la recherche.
- Cœur → `arrayUnion` / `arrayRemove` sur `favorites` : ajout ou retrait **atomique**, sans doublon.
- La page Favoris utilise un `effect` : à chaque changement de `favorites`, elle recharge les films correspondants (cache pour éviter de rappeler TMDB).

### Espace admin (`admin.page.ts`)
- **CRUD des films** (collection `movies`) : **Create** `addDoc`, **Update** `updateDoc` (bouton « Modifier » : remplit le formulaire, puis « Enregistrer les modifications »), **Delete** `deleteDoc` (bouton « Supprimer » avec confirmation). Les 4 champs (titre, année, affiche, résumé) sont obligatoires, validés dans le formulaire et aussi côté serveur par les règles. Un compteur `catalogVersion` (signal) prévient les pages Films et Favoris de se recharger après chaque changement.
- **Désactiver un utilisateur :** `ion-toggle` → `updateDoc(users/<uid>, { active })`. **Aucun `deleteDoc`** : la suppression est même interdite par les règles de sécurité.
- L'onglet Admin n'apparaît que si `auth.isAdmin()` et la route est protégée par `adminGuard`.

## 6. Le matching (`match.service.ts`)

Le sujet demande un « taux de correspondance » supérieur à 75 % entre listes de favoris. On utilise l'**indice de Jaccard** :

```
            films en commun
taux  =  ─────────────────────────────
          films différents au total (A ∪ B)
```

| Liste A | Liste B | En commun | Au total | Taux |
|---|---|---|---|---|
| 1,2,3,4,5,6,7 | 1,2,3,4,5,6,7 | 7 | 7 | 100 % |
| 1,2,3,4,5,6,7 | 1,2,3,4,5,6,7,8 | 7 | 8 | 88 % |
| 1,2,3,4 | 1,2,3,5 | 3 | 5 | 60 % |
| 1,2,3,4,5,6,7 | 1,2,3 | 3 | 7 | 43 % |

**Pourquoi Jaccard ?** Il pénalise aussi bien les films manquants que les films en trop : quelqu'un qui aime *tous* les films ne « matche » pas avec tout le monde.

**Algorithme (`findMatches`)** : on lit les utilisateurs actifs (`where('active','==',true)`), on retire soi-même, on calcule le taux avec chacun, on garde ceux qui atteignent le seuil `MATCH_THRESHOLD = 0.75` et on trie du plus proche au moins proche. Les comptes désactivés n'apparaissent donc jamais.

> Le comparateur est `>=`. Si ton prof veut « strictement plus de 75 % », change `>=` en `>` dans `findMatches` (une seule ligne).

## 7. Sécurité (`firestore.rules`)

Cacher un bouton ne suffit pas : un utilisateur malin pourrait appeler Firebase lui-même. Les règles sont appliquées **côté serveur** :
- il faut être connecté pour lire ;
- à l'inscription, on ne peut créer que **son propre** profil, avec `role: 'user'` et `active: true` (impossible de se déclarer admin) ;
- un utilisateur ne peut modifier **que** son champ `favorites` ;
- seul un admin peut modifier le champ `active` d'un compte ;
- personne ne peut supprimer un profil ;
- seul un admin peut ajouter, modifier ou supprimer un film, et les 4 champs doivent être remplis.

## 8. Comment l'app est compilée

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | Télécharge les bibliothèques listées dans `package.json` dans `node_modules/`. |
| `npm start` (`ng serve`) | Compile en mémoire et sert l'app sur `localhost:4200`, avec rechargement automatique à chaque sauvegarde. |
| `npm run build` (`ng build`) | Compile TypeScript → JavaScript, assemble tout et produit l'app finale dans `dist/movieApp/browser/`. |
| `npx cap add android` | Crée le projet Android natif (dossier `android/`). |
| `npx cap sync` | Copie `dist/movieApp/browser` dans le projet Android et met à jour les plugins (caméra…). |
| Android Studio ▶ | Compile l'application Android (APK) et l'installe sur le téléphone. |

Chaîne complète : **TypeScript/HTML/SCSS → (Angular) → fichiers web dans `dist/` → (Capacitor) → application Android**.

## 9. Questions probables à la validation

- **Pourquoi Firestore ?** Base de données gérée dans le cloud, temps réel, règles de sécurité intégrées, gratuite pour ce volume.
- **Pourquoi `active: false` et pas une suppression ?** Exigence du sujet ; ça garde l'historique, c'est réversible, et les règles interdisent la suppression.
- **Où est stockée la photo ?** En base64 dans le document utilisateur après réduction à 320 px.
- **Comment est calculé le matching ?** Indice de Jaccard (section 6), seuil 75 %.
- **Comment sait-on qu'un utilisateur est admin ?** Champ `role` dans Firestore, vérifié par `adminGuard` côté application **et** par les règles côté serveur.
- **Comment un compte désactivé est-il bloqué ?** À la connexion (`login` vérifie `active`), au démarrage (`restore`), et en temps réel (`onSnapshot`).
- **Qu'est-ce qu'un composant standalone ?** Un composant Angular qui déclare lui-même ce qu'il utilise (`imports: [...]`), sans module `NgModule`.
- **Qu'est-ce qu'un service ?** Une classe qui contient la logique et que les pages se font fournir par `inject()` (injection de dépendances).
