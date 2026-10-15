import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { Unsubscribe, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AppUser } from '../models';

export interface RegisterData {
  nom: string;
  prenom: string;
  age: number;
  photo: string;
  email: string;
  password: string;
}

/**
 * Gère la connexion, l'inscription et l'utilisateur courant.
 *
 * `user` est un "signal" : toutes les pages qui l'utilisent se mettent à jour automatiquement
 * quand il change (nouveau favori, compte désactivé, etc.).
 *
 * Une fois connecté, on écoute en temps réel le document Firestore de l'utilisateur (onSnapshot) :
 *  - les favoris restent synchronisés,
 *  - si un administrateur désactive le compte, l'utilisateur est déconnecté immédiatement.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  readonly user = signal<AppUser | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  private stopWatching?: Unsubscribe;
  private restoring?: Promise<void>;

  /** Au démarrage : retrouve la session Firebase existante (une seule fois). Utilisé par les guards. */
  restore(): Promise<void> {
    this.restoring ??= (async () => {
      try {
        await auth.authStateReady();
        if (auth.currentUser) await this.openSession(auth.currentUser.uid);
      } catch {
        this.user.set(null);
      }
    })();
    return this.restoring;
  }

  async register(data: RegisterData): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const profile: AppUser = {
      uid: cred.user.uid,
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      age: data.age,
      photo: data.photo,
      role: 'user', // un nouvel inscrit n'est jamais admin
      active: true,
      favorites: [],
    };
    try {
      await setDoc(doc(db, 'users', profile.uid), profile);
    } catch (e) {
      await deleteUser(cred.user); // on ne laisse pas un compte Auth sans profil
      throw e;
    }
    await this.openSession(profile.uid);
  }

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const ok = await this.openSession(cred.user.uid);
    if (!ok) throw new Error('Ce compte a été désactivé par un administrateur.');
  }

  async logout(): Promise<void> {
    await this.closeSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /** Charge le profil, refuse les comptes désactivés, puis écoute les changements en temps réel. */
  private async openSession(uid: string): Promise<boolean> {
    const ref = doc(db, 'users', uid);
    const profile = (await getDoc(ref)).data() as AppUser | undefined;
    if (!profile || !profile.active) {
      await this.closeSession();
      return false;
    }
    this.user.set(profile);

    this.stopWatching?.();
    this.stopWatching = onSnapshot(
      ref,
      (snap) => {
        const p = snap.data() as AppUser | undefined;
        if (!p || !p.active) {
          // Compte désactivé pendant que l'utilisateur utilisait l'app
          void this.logout();
        } else {
          this.user.set(p);
        }
      },
      () => undefined,
    );
    return true;
  }

  private async closeSession(): Promise<void> {
    this.stopWatching?.();
    this.stopWatching = undefined;
    this.user.set(null);
    await signOut(auth);
  }
}
