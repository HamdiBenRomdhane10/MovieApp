import { Injectable } from '@angular/core';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser } from '../models';

/** Opérations d'administration sur les utilisateurs. */
@Injectable({ providedIn: 'root' })
export class UserService {
  /** Tous les utilisateurs normaux (les admins ne sont pas listés). */
  async listUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .map((d) => d.data() as AppUser)
      .filter((u) => u.role !== 'admin')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }

  /** Active ou désactive un compte. On ne supprime jamais : on change seulement `active`. */
  setActive(uid: string, active: boolean) {
    return updateDoc(doc(db, 'users', uid), { active });
  }
}
