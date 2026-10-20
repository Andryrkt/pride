import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-white p-6", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-xs font-bold uppercase tracking-[0.14em] text-brand-600", className)} {...props} />;
}

const tones = {
  green: "bg-brand-50 text-brand-800",
  red: "bg-flame-50 text-flame-800",
  yellow: "bg-sun-50 text-sun-800",
  gray: "bg-[#ecefea] text-[#3d4842]",
  dark: "bg-brand-800 text-white",
};

export function Badge({ tone = "green", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap", tones[tone], className)} {...props} />;
}
