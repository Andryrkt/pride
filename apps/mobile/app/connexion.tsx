import { router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const input = "min-h-12 rounded-xl border-2 border-[#c3ccc5] bg-white px-4 text-base text-ink";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError("E-mail ou mot de passe incorrect.");
    router.replace("/accueil");
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center gap-5 p-6">
          <Image source={require("../assets/logo.png")} className="h-28 w-20 self-center" resizeMode="contain" accessibilityLabel="PRIDe" />
          <Text className="text-center text-3xl font-extrabold text-ink">Espace membres</Text>
          {error && <Text className="rounded-xl bg-flame-50 p-3 font-semibold text-flame-800">{error}</Text>}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-ink">E-mail</Text>
            <TextInput className={input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="E-mail" />
          </View>
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-ink">Mot de passe</Text>
            <TextInput className={input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" accessibilityLabel="Mot de passe" />
          </View>
          <Button title="Se connecter" onPress={onSubmit} loading={loading} disabled={!email || !password} />
          <Text className="text-center text-sm text-muted">Pas encore membre ? Déposez votre candidature sur le site de PRIDe.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
