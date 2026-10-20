import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatAriary, PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { Badge, Button, Card, ErrorBox, Loading } from "@/components/ui";
import { api, useApi, type Cotisations } from "@/lib/api";

export default function CotisationsScreen() {
  const { data, error, loading, reload } = useApi<Cotisations>("/api/v1/cotisations");
  const [provider, setProvider] = useState<PaymentProviderId>("MVOLA");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  if (loading && !data) return <Loading />;
  const unpaid = data?.dues.filter((d) => d.status === "A_PAYER") ?? [];
  const total = unpaid.reduce((s, d) => s + d.amount, 0);

  async function pay() {
    setPaying(true);
    try {
      const r = await api<{ status: string; receiptNumber: string | null }>("/api/v1/paiements", {
        method: "POST",
        body: JSON.stringify({ dueIds: unpaid.map((d) => d.id), provider, phone }),
      });
      Alert.alert("Paiement", r.receiptNumber ? `Paiement reçu. Reçu n° ${r.receiptNumber}.` : "Validez le paiement sur votre téléphone.");
      await reload();
    } catch (e) {
      Alert.alert("Paiement impossible", e instanceof Error ? e.message : "Erreur");
    } finally {
      setPaying(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 p-5" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        <Text className="text-3xl font-extrabold text-ink">Mes cotisations</Text>
        {error && <ErrorBox message={error} onRetry={reload} />}
        {unpaid.length > 0 && (
          <Card className="gap-4">
            <Text className="text-xl font-bold text-ink">À payer : {formatAriary(total)}</Text>
            {unpaid.map((d) => (
              <Text key={d.id} className="text-muted">{d.label} · {formatAriary(d.amount)}</Text>
            ))}
            <View className="gap-2">
              {(Object.keys(PAYMENT_PROVIDERS) as PaymentProviderId[]).map((p) => (
                <Pressable key={p} onPress={() => setProvider(p)} accessibilityRole="radio" accessibilityState={{ checked: provider === p }} className={`min-h-12 flex-row items-center rounded-xl border-2 px-4 ${provider === p ? "border-brand-600 bg-[#f0f8f3]" : "border-line bg-white"}`}>
                  <Text className="font-semibold text-ink">{PAYMENT_PROVIDERS[p]}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput className="min-h-12 rounded-xl border-2 border-[#c3ccc5] bg-white px-4 text-base" placeholder="Numéro à débiter (034 12 345 67)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} accessibilityLabel="Numéro à débiter" />
            <Button title={`Payer ${formatAriary(total)}`} onPress={pay} loading={paying} disabled={!phone} />
          </Card>
        )}
        <Card className="gap-2">
          <Text className="mb-1 text-xl font-bold text-ink">Échéances</Text>
          {data?.dues.map((d) => (
            <View key={d.id} className="flex-row items-center justify-between border-b border-line py-2">
              <Text className="flex-1 text-ink">{d.label}</Text>
              <Badge label={d.status === "PAYEE" ? "Payée" : "À payer"} tone={d.status === "PAYEE" ? "green" : "red"} />
            </View>
          ))}
        </Card>
        {!!data?.payments.length && (
          <Card className="gap-2">
            <Text className="mb-1 text-xl font-bold text-ink">Reçus</Text>
            {data.payments.map((p) => (
              <Text key={p.id} className="text-ink">{p.receiptNumber ?? "En attente"} · {formatAriary(p.amount)}</Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
