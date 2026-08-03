import { createServerFn } from "@tanstack/react-start";
import { localizeOgHandler } from "@/lib/og-lang.server";

export const localizeOg = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data)
  .handler(async ({ data }) => localizeOgHandler(data));
