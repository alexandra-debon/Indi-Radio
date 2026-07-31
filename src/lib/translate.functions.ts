import { createServerFn } from "@tanstack/react-start";
import { translateContentHandler } from "@/lib/translate.server";

export const translateContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data)
  .handler(async ({ data }) => translateContentHandler(data));