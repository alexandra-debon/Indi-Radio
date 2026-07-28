import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta helper — type it locally so tsc doesn't fail if the SDK doesn't ship types yet.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;

function isSameOriginPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } as never });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return data;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="max-w-md mx-auto p-6 text-white">
      <h1 className="text-xl font-semibold mb-2">Autorisation impossible</h1>
      <p className="text-white/80 text-sm">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "cette application";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune URL de redirection reçue.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="max-w-md mx-auto p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">
        Connecter <span className="text-primary">{clientName}</span> à Indi Radio
      </h1>
      <p className="text-white/80 text-sm mb-4">
        {clientName} pourra utiliser les outils Indi Radio (mur social, coups de cœur,
        podcasts, profil) <strong>en agissant en tant que vous</strong>. Les règles d'accès
        et de sécurité de l'app restent en vigueur.
      </p>
      {details?.scope && (
        <p className="text-white/60 text-xs mb-4">Permissions demandées : {details.scope}</p>
      )}
      {error && (
        <p role="alert" className="text-red-400 text-sm mb-3">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 bg-primary text-black font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
          Autoriser
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 bg-white/10 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          Refuser
        </button>
      </div>
    </main>
  );
}

// keep isSameOriginPath referenced (used by /auth route to validate next)
export { isSameOriginPath };