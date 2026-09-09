import { Auth } from "firebase-admin/auth"
import { cookies } from "next/headers"
const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 
const adminAuth = new Auth()
export async function createSessionAction(idToken : string) {
    try{
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn : SESSION_DURATION_MS
        })

        const cookieStore = await cookies()
        
        cookieStore.set('__session', sessionCookie, {
            maxAge : SESSION_DURATION_MS / 1000,
            httpOnly : true,
            secure : process.env.NODE_ENV === 'production',
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
            error : 'Failed to create session.'
        }
    }
}

export async function destroySessionAction(){
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    
    if(session){
        try{
            const claims = await adminAuth.verifySessionCookie(session)
            await adminAuth.revokeRefreshTokens(claims.uid);
        }
        catch(e){

        }
    }

    cookieStore.delete('__session')
    return {
        ok : true,
        data : undefined
    }
}