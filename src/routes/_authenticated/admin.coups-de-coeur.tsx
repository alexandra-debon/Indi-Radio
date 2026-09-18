import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { FavoritesAdmin } from "@/components/admin/FavoritesAdmin";

export const Route = createFileRoute("/_authenticated/admin/coups-de-coeur")({
  head: () => ({
    meta: [{ title: "Coups de cœur — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminCoupsPage,
});

function AdminCoupsPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");

  if (!isAdmin) {
    return (
      <div className="card-brut flex items-center gap-2 p-4 text-sm">
        <ShieldAlert className="size-4 text-destructive" />
        Accès refusé.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="section-title flex items-center gap-2">
          <Heart className="size-6 fill-primary text-primary" />
          Coups de cœur
        </h1>
        <p className="text-sm text-muted-foreground">
          Créer, modifier, publier ou supprimer les coups de cœur de la rédaction.
        </p>
      </header>

      <Input
        placeholder="Rechercher par titre ou artiste…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <FavoritesAdmin search={search} />
    </div>
  );
}
