import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shows",
  title: "List shows and podcasts",
  description: "List Indi Radio shows, podcasts and chroniques.",
  inputSchema: {
    type: z.string().optional().describe("Optional filter (e.g. 'podcast', 'emission', 'chronique')."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type, limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("shows")
      .select("id, type, title, host, description, schedule, cover_url")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { shows: data },
    };
  },
});