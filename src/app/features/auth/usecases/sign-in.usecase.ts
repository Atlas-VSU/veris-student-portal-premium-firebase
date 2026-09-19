import { signInWithEmailAndPassword } from "firebase/auth";
import { createSessionUsecase } from "./create-session-cookie.usecase";
import { auth } from "@/lib/firebase/client";
import { session } from "./create-session-cookie.usecase";
export const signInUsecase = async (email : string, password : string) : Promise<session> => {
    const response = signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
        const user = userCredential.user
        const idToken = await user.getIdToken();
        return await createSessionUsecase(idToken);
    }).catch((error : Error) => {
        const errorMessage = error.message;
        throw error;
    })
    return response;
}