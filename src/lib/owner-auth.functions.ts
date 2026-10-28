import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function guard() {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  assertSameSiteRequest();
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
}

/** Server-function middleware: only a signed-in owner (OTP session cookie) gets through. */
export const ownerMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  await guard();
  const { requireOwner } = await import("@/lib/owner-auth.server");
  const ownerEmail = await requireOwner();
  return next({ context: { ownerEmail } });
});

export const SENT_MESSAGE = "If this email is registered, a code was sent.";

export const sendOwnerLoginCode = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().max(200) }))
  .handler(async ({ data }): Promise<{ ok: true; message: string }> => {
    await guard();
    const { sendOwnerCode } = await import("@/lib/owner-auth.server");
    await sendOwnerCode(data.email);
    return { ok: true, message: SENT_MESSAGE };
  });

export const verifyOwnerLoginCode = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().max(200), code: z.string().trim().max(10) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await guard();
    const { verifyOwnerCode } = await import("@/lib/owner-auth.server");
    return { ok: await verifyOwnerCode(data.email, data.code) };
  });

export const ownerSession = createServerFn({ method: "GET" }).handler(async (): Promise<{ email: string | null }> => {
  const { currentOwner } = await import("@/lib/owner-auth.server");
  return { email: await currentOwner() };
});

export const signOutOwnerDesk = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  await guard();
  const { signOutOwner } = await import("@/lib/owner-auth.server");
  await signOutOwner();
  return { ok: true };
});
