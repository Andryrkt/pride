import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Loading } from "@/components/ui";
import { useApi, type Me } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export default function Profil() {
  const { data, loading } = useApi<Me>("/api/v1/me");
  if (loading && !data) return <Loading />;
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-5">
        <Text className="text-3xl font-extrabold text-ink">Mon profil</Text>
        {data && (
          <Card className="gap-2">
            <Text className="text-lg font-bold text-ink">{data.member.lastName} {data.member.firstNames}</Text>
            <Text className="text-muted">N° {data.member.number}</Text>
            <Text className="text-muted">Téléphone : {data.member.phone ?? "—"}</Text>
            <Text className="text-muted">Compétences : {data.member.skills.join(", ") || "—"}</Text>
          </Card>
        )}
        <Button
          title="Se déconnecter"
          variant="outline"
          onPress={async () => {
            await authClient.signOut();
            router.replace("/connexion");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
