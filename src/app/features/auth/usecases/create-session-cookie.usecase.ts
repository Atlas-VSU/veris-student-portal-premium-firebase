import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000;

export const createSessionUsecase = async (idToken : string) => {
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
                }
    }
    catch(e){
        return {
            ok : false,
            error : 'Failed to create session'
        }
    }
}
