import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : "",
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Indi Radio" },
      { name: "description", content: "Connecte-toi ou crée un compte Indi Radio." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "https://www.radio.indi-art-culture.com/auth" },
    ],
  }),
  component: AuthRedirect,
});

// The auth dialog is global — this route opens it and, when a session becomes
// available, sends the user to `next` (used by the OAuth consent flow) or home.
function AuthRedirect() {
  const { openAuth, session } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  useEffect(() => {
    if (session) {
      if (next) {
        window.location.replace(next);
      } else {
        navigate({ to: "/", replace: true });
      }
      return;
    }
    openAuth();
  }, [openAuth, navigate, session, next]);
  return null;
}