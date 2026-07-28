import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_coups_de_coeur",
  title: "List Coups de Cœur",
  description: "List Indi Radio's editorial 'Coups de Cœur' picks (published only).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Number of picks (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("coups_de_coeur")
      .select("id, artist, title, kind, comment, discovery_story, cover_url, editorial_rating, featured_date")
      .eq("published", true)
      .order("featured_date", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data },
    };
  },
});