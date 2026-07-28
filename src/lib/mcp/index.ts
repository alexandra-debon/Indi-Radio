import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMe from "./tools/get-me";
import listRecentPosts from "./tools/list-recent-posts";
import createPost from "./tools/create-post";
import listCoupsDeCoeur from "./tools/list-coups-de-coeur";
import listShows from "./tools/list-shows";

// Direct Supabase issuer host (never the .lovable.cloud proxy — RFC 8414 §3.3).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "indi-radio-mcp",
  title: "Indi Radio",
  version: "0.1.0",
  instructions:
    "Tools to read and interact with Indi Radio — the 24/7 independent music radio, magazine and social wall. " +
    "Use `get_me` for the signed-in profile, `list_recent_posts` for the social wall, `create_post` to publish, " +
    "`list_coups_de_coeur` for editorial picks, `list_shows` for shows and podcasts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMe, listRecentPosts, createPost, listCoupsDeCoeur, listShows],
});