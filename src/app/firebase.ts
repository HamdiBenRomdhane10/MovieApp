import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

/**
 * Initialisation unique de Firebase.
 * On utilise directement le SDK "firebase" (et non @angular/fire, qui ne supporte pas encore Angular 22).
 */
export const firebaseApp = initializeApp(environment.firebase);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
