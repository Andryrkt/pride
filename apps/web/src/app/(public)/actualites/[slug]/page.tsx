import Image from "next/image";
import { notFound } from "next/navigation";
import { and, db, eq, schema } from "@pride/db";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EventRegistration } from "../event-registration";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.query.posts.findFirst({ where: and(eq(schema.posts.slug, slug), eq(schema.posts.visibility, "PUBLIC")) });
  if (!post) notFound();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-14 sm:px-6">
      <Eyebrow>{post.type === "EVENEMENT" ? "Événement" : "Article"} · {formatDate(post.publishedAt)}</Eyebrow>
      <h1 className="text-4xl font-extrabold sm:text-5xl">{post.title}</h1>
      {post.eventAt && <p className="text-lg font-semibold">{formatDateTime(post.eventAt)} · {post.location}</p>}
      {post.type === "EVENEMENT" && post.eventAt && post.eventAt > new Date() && (
        <div className="flex flex-wrap">
          <EventRegistration postId={post.id} />
        </div>
      )}
      {post.imageUrl && <Image src={post.imageUrl} alt="" width={1000} height={650} className="max-h-[480px] w-full rounded-3xl object-cover object-top" />}
      <p className="text-xl text-[#3a4740]">{post.excerpt}</p>
      {post.body.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="text-[17px] leading-relaxed text-[#2b3832]">{p}</p>
      ))}
      <ButtonLink href="/actualites" variant="outline" className="self-start">Toutes les actualités</ButtonLink>
    </article>
  );
}
