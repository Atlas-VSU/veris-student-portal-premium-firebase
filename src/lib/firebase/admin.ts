import * as admin from 'firebase-admin'

import { Auth, getAuth } from 'firebase-admin/auth'
import { getFirestore} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const firebaseConfig : admin.AppOptions = {
    credential : admin.cert(
        {
            projectId : process.env.FIREBASE_PROJECT_ID,
            clientEmail : process.env.FIREBASE_CLIENT_EMAIL,
            privateKey : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
    ),
    storageBucket : process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
}

const app = !admin.getApps().length ? admin.initializeApp(firebaseConfig) : admin.getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);