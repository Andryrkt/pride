import { ActivityIndicator, Pressable, Text, View, type PressableProps, type ViewProps } from "react-native";

export function Card({ className = "", ...props }: ViewProps & { className?: string }) {
  return <View className={`rounded-2xl border border-line bg-white p-5 ${className}`} {...props} />;
}

export function Button({ title, variant = "primary", loading, className = "", ...props }: PressableProps & { title: string; variant?: "primary" | "outline"; loading?: boolean; className?: string }) {
  const base = variant === "primary" ? "bg-brand-600" : "bg-white border-2 border-brand-600";
  return (
    <Pressable accessibilityRole="button" className={`min-h-12 flex-row items-center justify-center rounded-full px-6 active:opacity-80 ${base} ${props.disabled ? "opacity-60" : ""} ${className}`} {...props}>
      {loading ? <ActivityIndicator color={variant === "primary" ? "#fff" : "#146b47"} /> : <Text className={`text-base font-semibold ${variant === "primary" ? "text-white" : "text-brand-600"}`}>{title}</Text>}
    </Pressable>
  );
}

export function Badge({ label, tone = "green" }: { label: string; tone?: "green" | "dark" | "red" }) {
  const cls = tone === "dark" ? "bg-brand-800" : tone === "red" ? "bg-flame-50" : "bg-brand-50";
  const txt = tone === "dark" ? "text-white" : tone === "red" ? "text-flame-800" : "text-brand-800";
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${cls}`}>
      <Text className={`text-xs font-semibold ${txt}`}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-paper">
      <ActivityIndicator size="large" color="#146b47" />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="gap-3 border-flame-600 bg-flame-50">
      <Text className="font-semibold text-flame-800">{message}</Text>
      {onRetry && <Button title="Réessayer" variant="outline" onPress={onRetry} />}
    </Card>
  );
}
