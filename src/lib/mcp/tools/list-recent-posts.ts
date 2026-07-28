import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_recent_posts",
  title: "List recent wall posts",
  description: "List the most recent Indi Radio social wall posts.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Number of posts (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("posts")
      .select("id, title, content, image_url, image_urls, created_at, author_id, profiles:author_id(pseudo, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { posts: data },
    };
  },
});