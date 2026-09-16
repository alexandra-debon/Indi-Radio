import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { MyPostsManager } from "@/components/wall/MyPostsManager";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/publications")({
  head: () => ({
    meta: [{ title: "Mes publications — InDi RaDio" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPostsPage,
});

function MyPostsPage() {
  const { session } = useAuth();
  const lang = useLang();
  const fr = lang !== "en";

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <ArrowLeft className="size-4" /> {fr ? "Retour" : "Back"}
      </Link>
      <h1 className="section-title flex items-center gap-2">
        <FileText className="size-5 text-primary" /> {fr ? "Mes publications" : "My posts"}
      </h1>
      <section className="card-brut space-y-3 p-4">
        {session ? (
          <MyPostsManager userId={session.user.id} />
        ) : (
          <p className="text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>
        )}
      </section>
    </div>
  );
}
