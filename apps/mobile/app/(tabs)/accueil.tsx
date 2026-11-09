import { router } from "expo-router";
import { RefreshControl, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatAriary } from "@pride/shared";
import { MemberCard } from "@/components/member-card";
import { Button, Card, ErrorBox, Loading } from "@/components/ui";
import { useApi, type Me } from "@/lib/api";

export default function Accueil() {
  const { data, error, loading, reload } = useApi<Me>("/api/v1/me");
  if (loading && !data) return <Loading />;
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-5" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        {error && <ErrorBox message={error} onRetry={reload} />}
        {data && (
          <>
            <Text className="text-3xl font-extrabold text-ink">Bonjour {data.member.firstNames.split(" ")[0]}</Text>
            <MemberCard member={data.member} />
            <Card className={data.dues.unpaidCount ? "gap-3 border-[#f1c9c3] bg-[#fff7f5]" : "gap-3"}>
              <Text className="text-xs font-bold uppercase tracking-widest text-muted">Cotisations</Text>
              <Text className="text-2xl font-extrabold text-ink">{data.dues.unpaidCount ? `${formatAriary(data.dues.unpaidTotal)} à payer` : "À jour"}</Text>
              {data.dues.unpaidCount > 0 && <Button title="Payer par mobile money" onPress={() => router.push("/cotisations")} />}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
