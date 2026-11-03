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
  const [reference, setReference] = useState("");
  const [paying, setPaying] = useState(false);
  if (loading && !data) return <Loading />;
  // Une échéance déjà déclarée attend sa vérification : elle ne se déclare pas deux fois.
  const unpaid = data?.dues.filter((d) => d.status === "A_PAYER" && !d.pending) ?? [];
  const total = unpaid.reduce((s, d) => s + d.amount, 0);
  const accounts = data?.accounts ?? [];
  const account = accounts.find((a) => a.provider === provider) ?? accounts[0];

  async function pay() {
    setPaying(true);
    try {
      await api("/api/v1/paiements", {
        method: "POST",
        body: JSON.stringify({ dueIds: unpaid.map((d) => d.id), provider: account!.provider, phone, reference }),
      });
      Alert.alert("Déclaration enregistrée", "L'association va vérifier la réception de l'argent ; votre reçu sera créé ensuite.");
      setReference("");
      await reload();
    } catch (e) {
      Alert.alert("Déclaration impossible", e instanceof Error ? e.message : "Erreur");
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
            {account ? (
              <>
                <View className="gap-2">
                  {accounts.map((a) => (
                    <Pressable key={a.provider} onPress={() => setProvider(a.provider)} accessibilityRole="radio" accessibilityState={{ checked: account.provider === a.provider }} className={`min-h-12 flex-row items-center rounded-xl border-2 px-4 ${account.provider === a.provider ? "border-brand-600 bg-[#f0f8f3]" : "border-line bg-white"}`}>
                      <Text className="font-semibold text-ink">{PAYMENT_PROVIDERS[a.provider]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text className="text-ink">Envoyez {formatAriary(total)} au {account.number} ({account.holder}) par votre menu habituel. Les frais d'envoi sont à votre charge. Ne donnez jamais votre code secret.</Text>
                <TextInput className="min-h-12 rounded-xl border-2 border-[#c3ccc5] bg-white px-4 text-base" placeholder="Numéro utilisé pour l'envoi * (034 12 345 67)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} accessibilityLabel="Numéro utilisé pour l'envoi, champ obligatoire" />
                <TextInput className="min-h-12 rounded-xl border-2 border-[#c3ccc5] bg-white px-4 text-base" placeholder="Référence de la transaction *" autoCapitalize="characters" value={reference} onChangeText={setReference} accessibilityLabel="Référence de la transaction, champ obligatoire" />
                <Text className="text-sm text-muted"><Text className="text-flame-600">*</Text> champ obligatoire</Text>
                <Button title={`J'ai envoyé ${formatAriary(total)} : déclarer`} onPress={pay} loading={paying} disabled={!phone || !reference} />
              </>
            ) : (
              <Text className="text-ink">L'association n'a pas encore ouvert le paiement par mobile money. En attendant, vous pouvez payer en espèces auprès du comptable ou du Trésorier.</Text>
            )}
          </Card>
        )}
        <Card className="gap-2">
          <Text className="mb-1 text-xl font-bold text-ink">Échéances</Text>
          {data?.dues.map((d) => (
            <View key={d.id} className="flex-row items-center justify-between border-b border-line py-2">
              <Text className="flex-1 text-ink">{d.label}</Text>
              <Badge label={d.status === "PAYEE" ? "Payée" : d.pending ? "En vérification" : "À payer"} tone={d.status === "PAYEE" ? "green" : d.pending ? "dark" : "red"} />
            </View>
          ))}
        </Card>
        {!!data?.payments.length && (
          <Card className="gap-2">
            <Text className="mb-1 text-xl font-bold text-ink">Reçus</Text>
            {data.payments.map((p) => (
              <Text key={p.id} className="text-ink">{p.receiptNumber ?? (p.status === "ECHOUE" ? `Refusé : ${p.rejectionReason ?? ""}` : "En vérification")} · {formatAriary(p.amount)}</Text>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
