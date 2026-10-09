import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { replaceOwnerPassword, resetOwnerPassword } from "@/lib/owner-reset.server";

export const setOwnerPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().trim().min(20).max(200),
      password: z.string().min(8).max(128),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await resetOwnerPassword(data.token, data.password);
    return { ok: true };
  });

export const forgotOwnerPassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(8).max(128) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await replaceOwnerPassword(data.password);
    return { ok: true };
  });
