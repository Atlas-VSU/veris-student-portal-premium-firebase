import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
export const destroySessionUsecase = async () => {
    const cookieStore = await cookies()
    const session = cookieStore.get('__session')?.value;

    if(session){
        const claims = await adminAuth.verifySessionCookie(session);
        await adminAuth.revokeRefreshTokens(claims.uid)
    }
    cookieStore.delete('__session')
    return { ok: true, data: undefined }
}