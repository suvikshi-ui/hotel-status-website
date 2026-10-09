import { auth } from "@/lib/auth/server";
import { HOTEL } from "@/lib/hotels";
import { OWNER_USER_ID } from "@/lib/owner-login";

export { OWNER_USER_ID };

type CredentialAccount = { providerId?: string };

export async function saveOwnerLogin(password: string): Promise<void> {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Use at least 8 characters.");
  }
  const ctx = await auth.$context;
  const email = HOTEL.email.toLowerCase();
  const hashed = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (!existing?.user) {
    const user = await ctx.internalAdapter.createUser({
      email,
      name: HOTEL.name,
      emailVerified: true,
    });
    await ctx.internalAdapter.createAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashed,
    });
    return;
  }
  const accounts = (existing.accounts ?? []) as CredentialAccount[];
  const hasPassword = accounts.some((account) => account.providerId === "credential");
  if (hasPassword) {
    await ctx.internalAdapter.updatePassword(existing.user.id, hashed);
    return;
  }
  await ctx.internalAdapter.createAccount({
    userId: existing.user.id,
    providerId: "credential",
    accountId: existing.user.id,
    password: hashed,
  });
}
