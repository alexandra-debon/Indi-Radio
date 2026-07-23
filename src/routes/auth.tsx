import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Indi Radio" },
      { name: "description", content: "Connecte-toi ou crée un compte Indi Radio." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "https://radio.indi-art-culture.com/auth" },
    ],
  }),
  component: AuthRedirect,
});

// The auth dialog is global — this route just opens it and redirects home.
function AuthRedirect() {
  const { openAuth } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    openAuth();
    navigate({ to: "/", replace: true });
  }, [openAuth, navigate]);
  return null;
}