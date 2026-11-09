import { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { Button } from "@/components/ui";
import type { Me } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/config";

type Format = "pdf" | "png";

/**
 * Carte de membre : aperçu de l'image générée par le serveur (photo, numéro, code QR de vérification),
 * puis téléchargement en PDF (à imprimer) ou en image (à garder ou partager) via le menu de partage du téléphone.
 */
export function MemberCard({ member }: { member: Me["member"] }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const headers = { Cookie: authClient.getCookie() };

  async function download(format: Format) {
    setBusy(format);
    try {
      const target = `${FileSystem.cacheDirectory}carte-pride-${member.number}.${format}`;
      const res = await FileSystem.downloadAsync(`${API_URL}/api/carte${format === "png" ? "?format=png" : ""}`, target, { headers });
      if (res.status !== 200) throw new Error(String(res.status));
      if (!(await Sharing.isAvailableAsync())) throw new Error("partage indisponible");
      await Sharing.shareAsync(res.uri, {
        mimeType: format === "png" ? "image/png" : "application/pdf",
        UTI: format === "png" ? "public.png" : "com.adobe.pdf",
        dialogTitle: "Ma carte de membre PRIDe",
      });
    } catch {
      Alert.alert("Carte non téléchargée", "Vérifiez votre connexion internet, puis réessayez.");
    } finally {
      setBusy(null);
    }
  }

  if (!member.hasPhoto) {
    return (
      <View className="gap-3 rounded-3xl bg-brand-800 p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-white">
            PRI<Text className="text-[#ff8a7a]">De</Text>
          </Text>
          <Text className="text-[11px] font-bold tracking-widest text-brand-100">CARTE DE MEMBRE</Text>
        </View>
        <Text className="text-xl font-extrabold text-white">{member.lastName} {member.firstNames}</Text>
        <Text className="text-brand-100">N° {member.number} · {member.categoryLabel}</Text>
        <Text className="text-brand-100">Pour obtenir votre carte avec son code QR, ajoutez d'abord votre photo dans « Mon profil » sur le site.</Text>
        <Button title="Ajouter ma photo sur le site" variant="outline" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/membre/profil`)} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Image
        source={{ uri: `${API_URL}/api/carte?format=png&apercu=1`, headers }}
        accessibilityLabel={`Carte de membre de ${member.firstNames} ${member.lastName}, n° ${member.number}, avec le code QR de vérification`}
        className="w-3/4 self-center rounded-2xl bg-brand-800"
        style={{ aspectRatio: 54 / 85.6 }}
        resizeMode="contain"
      />
      <Text className="text-center text-sm font-semibold text-ink">Télécharger ma carte</Text>
      <View className="flex-row gap-3">
        <Button title="PDF" className="flex-1" loading={busy === "pdf"} disabled={!!busy} onPress={() => download("pdf")} />
        <Button title="Image" variant="outline" className="flex-1" loading={busy === "png"} disabled={!!busy} onPress={() => download("png")} />
      </View>
      <Text className="text-center text-xs text-muted">PDF : pour imprimer. Image : à garder dans la galerie ou à envoyer.</Text>
    </View>
  );
}
