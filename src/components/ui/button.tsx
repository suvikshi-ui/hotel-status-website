import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[color,background-color,transform,opacity] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-terracotta text-cream hover:bg-terracotta-dark",
        ink: "bg-ink text-cream hover:bg-ink-soft",
        outline: "border border-border bg-ivory text-ink hover:bg-paper",
        ghost: "bg-transparent text-current hover:bg-cream/10",
        cream: "bg-cream text-ink hover:bg-paper-2",
      },
      size: {
        sm: "h-11 min-h-11 px-4 text-sm",
        md: "h-11 min-h-11 px-5 text-sm",
        lg: "h-12 min-h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
