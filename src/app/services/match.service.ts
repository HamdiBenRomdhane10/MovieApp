import { Injectable } from '@angular/core';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser, MatchResult } from '../models';

/** Seuil de correspondance exigé par le sujet : 75 %. */
export const MATCH_THRESHOLD = 0.75;

@Injectable({ providedIn: 'root' })
export class MatchService {
  /**
   * Taux de correspondance de Jaccard entre deux listes de favoris :
   *
   *        nombre de films en commun
   *  --------------------------------------
   *   nombre de films différents au total (A ∪ B)
   *
   * Exemple : A = {1,2,3,4}, B = {1,2,3,5}  →  3 en commun / 5 au total = 60 %.
   * Deux listes identiques donnent 100 %, deux listes sans rien en commun donnent 0 %.
   */
  similarity(a: string[], b: string[]): { score: number; common: string[] } {
    const setA = new Set(a);
    const setB = new Set(b);
    const common = [...setA].filter((id) => setB.has(id));
    const unionSize = new Set([...setA, ...setB]).size;
    return { score: unionSize === 0 ? 0 : common.length / unionSize, common };
  }

  /** Compare l'utilisateur avec tous les autres comptes actifs et garde ceux qui atteignent le seuil. */
  async findMatches(me: AppUser): Promise<{ matches: MatchResult[]; compared: number }> {
    const snap = await getDocs(query(collection(db, 'users'), where('active', '==', true)));
    const others = snap.docs.map((d) => d.data() as AppUser).filter((u) => u.uid !== me.uid);

    const matches = others
      .map((user) => ({ user, ...this.similarity(me.favorites, user.favorites) }))
      .filter((r) => r.score >= MATCH_THRESHOLD)
      .sort((x, y) => y.score - x.score);

    return { matches, compared: others.length };
  }
}
