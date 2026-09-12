'use server';
import { signInUsecase } from "./usecases/sign-in.usecase";
import { signOutUsecase } from "./usecases/sign-out.usecase";

export const signIn = async (email : string, password : string) => {
    return await signInUsecase(email, password);
}

export const signOut = async () => {
    const response = await signOutUsecase();
    return response
}
