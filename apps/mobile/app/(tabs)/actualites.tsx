import { RefreshControl, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Card, ErrorBox, Loading } from "@/components/ui";
import { useApi, type Post } from "@/lib/api";

const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function Actualites() {
  const { data, error, loading, reload } = useApi<{ posts: Post[] }>("/api/v1/actualites");
  if (loading && !data) return <Loading />;
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-5" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <Text className="text-3xl font-extrabold text-ink">Actualités</Text>
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data?.posts.map((p) => (
          <Card key={p.id} className="gap-2">
            <Badge label={p.visibility === "MEMBRES" ? "Membres seulement" : "Tout le monde"} tone={p.visibility === "MEMBRES" ? "dark" : "green"} />
            <Text className="text-lg font-bold text-ink">{p.title}</Text>
            <Text className="text-sm text-muted">{p.eventAt ? `${fmt(p.eventAt)} · ${p.location ?? ""}` : fmt(p.publishedAt)}</Text>
            <Text className="text-muted">{p.excerpt}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
