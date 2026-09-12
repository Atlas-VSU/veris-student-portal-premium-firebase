import { destroySessionUsecase } from "./revoke-session-cookie.usecase";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
export const signOutUsecase = async () => {
    signOut(auth).then( async () => {
        const response = await destroySessionUsecase();
        return response;
    } ).catch( (error) => {
        return {
            ok : false,
            data : undefined
        }
    })
}