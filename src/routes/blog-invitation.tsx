import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { acceptBlogInvite, getBlogInvite } from "@/lib/blog-invites.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ShieldCheck, MailCheck } from "lucide-react";

export const Route = createFileRoute("/blog-invitation")({
  head: () => ({
    meta: [
      { title: "Invitation auteur — Blog InDi ArT CulTuRe | InDi RaDio" },
      {
        name: "description",
        content:
          "Acceptez votre invitation à rédiger des articles sur le Blog InDi ArT CulTuRe, la radio 24/7 de la musique indépendante.",
      },
      { property: "og:title", content: "Invitation auteur — Blog InDi ArT CulTuRe" },
      {
        property: "og:description",
        content: "Acceptez votre invitation à publier sur le Blog InDi ArT CulTuRe d'InDi RaDio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlogInvitationPage,
});

function BlogInvitationPage() {
  const search = Route.useSearch() as Record<string, unknown>;
  const token = typeof search?.token === "string" ? search.token : "";
  const { session, openAuth } = useAuth();
  const navigate = useNavigate();
  const fetchInvite = useServerFn(getBlogInvite);
  const accept = useServerFn(acceptBlogInvite);
  const [done, setDone] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["blog-invite", token],
    enabled: token.length > 0,
    queryFn: () => fetchInvite({ data: { token } }),
  });

  const acceptMut = useMutation({
    mutationFn: () => accept({ data: { token } }),
    onSuccess: () => {
      setDone(true);
      toast.success("Invitation acceptée — tu peux publier sur le blog !");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate({ to: "/actus" }), 1500);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="section-title">Invitation — Blog InDi ArT CulTuRe</h1>

      <div className="card-brut space-y-3 p-4">
        {!token && <p className="text-sm text-muted-foreground">Lien d'invitation incomplet.</p>}
        {token && isLoading && <p className="text-sm text-muted-foreground">Vérification du lien…</p>}
        {token && !isLoading && invite && !invite.found && (
          <p className="text-sm font-semibold text-destructive">Invitation introuvable.</p>
        )}
        {invite?.found && invite.status === "revoked" && (
          <p className="text-sm font-semibold text-destructive">Cette invitation a été révoquée.</p>
        )}
        {invite?.found && invite.expired && invite.status !== "revoked" && (
          <p className="text-sm font-semibold text-destructive">Cette invitation a expiré.</p>
        )}
        {invite?.found && !invite.expired && invite.status !== "revoked" && (
          <>
            <p className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              Invitation pour <strong>{invite.email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              En acceptant, tu pourras publier et modifier tes articles sur le Blog InDi ArT CulTuRe.
            </p>
            {done ? (
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <MailCheck className="size-4" /> Invitation acceptée ! Redirection vers le blog…
              </p>
            ) : session ? (
              <Button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending}>
                Accepter l'invitation
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Connecte-toi avec l'adresse {invite.email} pour accepter.
                </p>
                <Button onClick={openAuth}>Se connecter</Button>
              </div>
            )}
          </>
        )}
        <div className="pt-1">
          <Link to="/actus" className="text-xs font-bold text-primary hover:underline">
            Aller au blog
          </Link>
        </div>
      </div>
    </div>
  );
}
