import { adminAuth } from "@/lib/firebase/admin";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000;

export interface session{
    ok : boolean,
    data? : RequestCookie | string,
    error? : any
}

export const createSessionUsecase = async (idToken : string) :  Promise<session>  =>{
    try{
         const sessionCookie = await adminAuth.createSessionCookie(idToken, {
                    expiresIn : SESSION_DURATION_MS
                })
                const cookieStore = await cookies();
        
                cookieStore.set('__session', sessionCookie, {
                    maxAge : SESSION_DURATION_MS / 1000,
                    httpOnly : true,
                    secure : process.env.NEXT_PUBLIC_NODE_ENV === 'production',
                    sameSite : 'strict',
                    path : '/'
                })
                return { 
                    ok : true,
                    data : undefined
                };
    }
    catch{
        throw new Error("Failed to log-in!");
    }
}
