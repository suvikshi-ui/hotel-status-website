import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { saveOwnerLogin } from "@/lib/owner-login.server";

export const saveOwnerPassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(8).max(128) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await saveOwnerLogin(data.password);
    return { ok: true };
  });
