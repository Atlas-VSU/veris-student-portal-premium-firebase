'use server';
import { cookies } from "next/headers";
import { adminAuth } from "@/app/lib/firebase/admin";
import type { ActionResult } from "@/app/types";

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000;
export const createSessionAction = async (idToken : string) => {
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

export const destroySessionAction = async () => {
    const cookieStore = await cookies()
    const session = cookieStore.get('__session')?.value;

    if(session){
        const claims = await adminAuth.verifySessionCookie(session);
        await adminAuth.revokeRefreshTokens(claims.uid)
    }
}