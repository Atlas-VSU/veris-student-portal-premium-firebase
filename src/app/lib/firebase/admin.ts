import * as admin from 'firebase-admin'

import { Auth, getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage';

const firebaseConfig : admin.AppOptions = {
    credential : admin.cert(
        {
            projectId : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail : process.env.FIREBASE_CLIENT_EMAIL,
            privateKey : process.env.FIREBASE_PRIVATE_KEY
        }
    )
}

const app = !admin.getApps().length ? admin.initializeApp(firebaseConfig) : undefined;

export const adminAuth = getAuth(app);
//export const adminStorage = getStorage(app);