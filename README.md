# MovieApp — Ionic + Angular + Firebase

Application mobile de gestion de films (mini-projet Ionic).

| Exigence du sujet | Où c'est fait |
|---|---|
| Inscription : nom, prénom, âge, **photo prise avec la caméra** | `pages/register` |
| Authentification | `pages/login`, `services/auth.service.ts` |
| Playlist de **films favoris** par utilisateur | `pages/home`, `pages/favorites` |
| **Admin** : ajouter, **modifier** et **supprimer** des films (CRUD, tous les champs obligatoires) | `pages/admin` (onglet « Films ») |
| **Admin** : **désactiver** un utilisateur (sans le supprimer) | `pages/admin` (onglet « Utilisateurs ») |
| Données dans **Firebase (Firestore)** + API publique **TMDB** | `services/*.ts`, `firestore.rules` |
| **Matching** de plus de 75 % entre listes de favoris | `pages/matches`, `services/match.service.ts` |

> L'explication détaillée du code est dans **[EXPLICATIONS.md](EXPLICATIONS.md)**.

---

## 1. Prérequis

| Outil | Version | Vérifier |
|---|---|---|
| Node.js | **22.22.3 ou plus** (ou 24.15+) — prends la version **LTS** sur nodejs.org | `node -v` |
| npm | fourni avec Node | `npm -v` |

Angular 22 refuse de démarrer avec un Node plus ancien. Si `node -v` affiche un numéro plus petit, réinstalle Node LTS.

Pour le téléphone Android (optionnel, plus tard) : Android Studio.

## 2. Installer le projet

Dézippe le dossier, ouvre un terminal dedans, puis :

```bash
npm install
```

(Si npm affiche `ERESOLVE`, relance `npm install --legacy-peer-deps`.)

## 3. Configurer TMDB et Firebase  ⚠️ obligatoire

Tout se règle dans un seul fichier : `src/environments/environment.ts`.

### 3.1 Clé TMDB
1. Crée un compte sur **themoviedb.org**.
2. Paramètres → **API** → demande une clé (type « Developer »).
3. Copie la **« API Key (v3 auth) »** dans `tmdbApiKey`.

### 3.2 Projet Firebase
1. Va sur **console.firebase.google.com** → **Ajouter un projet** (Analytics inutile).
2. **Authentication** → *Commencer* → onglet *Sign-in method* → active **Adresse e-mail/Mot de passe**.
3. **Firestore Database** → *Créer une base de données* → région au choix → mode **production**.
4. Onglet **Règles** de Firestore → remplace tout par le contenu du fichier **`firestore.rules`** → **Publier**.
5. Roue dentée ⚙ → **Paramètres du projet** → *Vos applications* → icône **Web `</>`** → enregistre l'app → copie l'objet `firebaseConfig` dans `environment.ts` (`apiKey`, `authDomain`, `projectId`, …).

## 4. Lancer l'application

```bash
npm start        # port 4200
# ou
ionic serve      # port 8100
```

Ouvre **http://localhost:4200**. (Pour le port Ionic habituel : `ionic serve` → **http://localhost:8100**.) Pour voir l'app comme sur téléphone : `F12` → icône « mobile » (Ctrl+Shift+M).

La caméra marche dans le navigateur (webcam du PC) : autorise l'accès quand le navigateur le demande.

## 5. Créer le compte administrateur

Un compte admin ne peut pas être créé depuis l'application (c'est volontaire, pour la sécurité) :

1. Dans l'app, **inscris-toi** normalement avec l'email de l'admin.
2. Console Firebase → **Firestore Database** → *Données* → collection `users` → clique sur le document de ce compte.
3. Modifie le champ **`role`** : remplace `user` par **`admin`** → *Mettre à jour*.
4. Déconnecte-toi puis reconnecte-toi : l'onglet **Admin** apparaît.

## 6. Scénario de démonstration (validation avec le prof)

1. Crée **4 comptes** utilisateurs (Ali, Sara, Karim, Nour) avec une photo chacun.
2. Ali met en favoris les films n°1 à 7 de la liste. Sara met les **mêmes 7** → 100 %.
   Nour met les mêmes 7 **+ 1 autre** → 7/8 = **88 %**. Karim met seulement 3 de ces films → 3/7 = **43 %**.
3. Connecté en Ali → onglet **Matching** : Sara (100 %) et Nour (88 %) apparaissent, **pas Karim**.
4. Connecté en admin : ajoute un film (titre, année, lien d'affiche, résumé : tous obligatoires) → il apparaît en tête de la liste des utilisateurs. Clique sur **Modifier** pour changer ses infos, puis sur **Supprimer** (avec confirmation) pour le retirer.
5. Admin → onglet **Utilisateurs** → désactive Sara. Elle est déconnectée immédiatement et ne peut plus se connecter (« compte désactivé »). Son compte existe toujours dans Firestore (`active: false`). Réactive-la pour montrer que c'est réversible.

## 7. Lancer sur un téléphone Android

```bash
npm install @capacitor/android      # une seule fois
npx cap add android                 # une seule fois (crée le dossier android/)
npm run cap:android                 # compile, synchronise et ouvre Android Studio
```

Dans Android Studio : branche ton téléphone (mode développeur + débogage USB activés) puis clique sur ▶ **Run**.
Après chaque modification du code, relance `npm run cap:android`.

Si la caméra ne s'ouvre pas sur Android, ajoute dans `android/app/src/main/AndroidManifest.xml`, avant `<application>` :
`<uses-permission android:name="android.permission.CAMERA" />`

## 8. Problèmes fréquents

| Message / symptôme | Solution |
|---|---|
| `The Angular CLI requires a minimum Node.js version…` | Installe Node LTS récent (voir §1). |
| Page blanche + erreur `auth/invalid-api-key` | `environment.ts` n'est pas rempli avec ta config Firebase. |
| `TMDB indisponible` en bas de l'écran | Clé TMDB absente ou fausse dans `environment.ts`. |
| `Missing or insufficient permissions` | Les règles de `firestore.rules` ne sont pas publiées (étape 3.2-4). |
| La liste de films n'affiche que ceux de l'admin | Même cause que TMDB : clé API. |
| La caméra ne s'ouvre pas dans le navigateur | Autorise la caméra pour `localhost` (cadenas dans la barre d'adresse). |
| Connexion refusée : « compte désactivé » | Normal : un admin a désactivé ce compte (champ `active`). |
