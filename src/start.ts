import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(formatRequestError(error));
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

function formatRequestError(error: unknown): string {
  if (error instanceof Error) return `[REQUEST_ERROR]\n${error.stack || `${error.name}: ${error.message}`}`;
  try {
    return `[REQUEST_ERROR_NON_ERROR]\n${JSON.stringify(error)}`;
  } catch {
    return `[REQUEST_ERROR_NON_ERROR]\n${String(error)}`;
  }
}

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
