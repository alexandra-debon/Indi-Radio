import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Publish a wall post",
  description: "Publish a new post on the Indi Radio social wall as the signed-in user.",
  inputSchema: {
    content: z.string().trim().min(1).max(4000).describe("Post body (supports @mentions and #hashtags)."),
    title: z.string().trim().max(140).optional().describe("Optional short title."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content, title }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("posts")
      .insert({ author_id: ctx.getUserId(), content, title: title ?? null })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Post published: ${data.id}` }],
      structuredContent: { post: data },
    };
  },
});