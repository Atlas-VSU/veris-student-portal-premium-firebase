import { signInWithEmailAndPassword } from "firebase/auth";
import { createSessionUsecase } from "./create-session-cookie.usecase";
import { auth } from "@/lib/firebase/client";

export const signInUsecase = async (email : string, password : string) => {
    signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
        const user = userCredential.user
        const idToken = await user.getIdToken();
        return await createSessionUsecase(idToken);
    }).catch((error : Error) => {
        const errorMessage = error.message;
        return {
            ok : false,
            message : "Failed to log in user." + errorMessage
        }
    })
}