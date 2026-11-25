"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function devSignInAction() {
  await signIn("dev", { redirectTo: "/notes" });
}

export async function oauthSignInAction(provider: "github" | "google") {
  await signIn(provider, { redirectTo: "/notes" });
}
