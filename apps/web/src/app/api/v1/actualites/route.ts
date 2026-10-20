import { desc, db, schema } from "@pride/db";
import { json, memberFromRequest } from "@/lib/api";

export async function GET(req: Request) {
  const v = await memberFromRequest(req);
  if (!v) return json({ error: "Non connecté" }, 401);
  const posts = await db.query.posts.findMany({ orderBy: desc(schema.posts.publishedAt), limit: 30 });
  return json({
    posts: posts.map((p) => ({ id: p.id, type: p.type, title: p.title, excerpt: p.excerpt, visibility: p.visibility, eventAt: p.eventAt, location: p.location, publishedAt: p.publishedAt })),
  });
}
