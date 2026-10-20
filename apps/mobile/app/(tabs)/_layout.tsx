import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import { Loading } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function TabsLayout() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  if (!data) return <Redirect href="/connexion" />;
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#146b47", tabBarInactiveTintColor: "#56635c", tabBarStyle: { height: 64, paddingBottom: 8 } }}>
      <Tabs.Screen name="accueil" options={{ title: "Accueil", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="cotisations" options={{ title: "Cotisations", tabBarIcon: icon("card-outline") }} />
      <Tabs.Screen name="actualites" options={{ title: "Actualités", tabBarIcon: icon("newspaper-outline") }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
