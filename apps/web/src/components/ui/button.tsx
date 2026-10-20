import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-800",
        outline: "bg-white text-brand-600 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-50 hover:text-brand-800",
        white: "bg-white text-brand-800 hover:bg-brand-50",
        danger: "bg-white text-flame-800 ring-[1.5px] ring-inset ring-flame-600 hover:bg-flame-50",
        ghost: "text-brand-600 hover:bg-brand-50",
      },
      size: { md: "min-h-12 px-6 text-[15px]", sm: "min-h-10 px-4 text-sm" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Variants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & Variants & { href: string }) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
