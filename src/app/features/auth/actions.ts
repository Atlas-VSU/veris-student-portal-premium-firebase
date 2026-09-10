'use server';
import { cookies } from "next/headers";
import { adminAuth } from "@/app/lib/firebase/admin";
import type { ActionResult } from "@/app/types";
import { createSessionUsecase } from "./usecases/create-session-cookie.usecase";
import { destroySessionUsecase } from "./usecases/revoke-session-cookie.usecase";
export const createSessionAction = async (idToken : string) => {
    return await createSessionUsecase(idToken);
}

export const destroySessionAction = async () => {
    return await destroySessionUsecase();
}