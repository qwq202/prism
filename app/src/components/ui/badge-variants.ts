import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-muted text-secondary-foreground hover:bg-muted/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground",
        full_outline:
          "text-foreground bg-muted hover:bg-muted/90 border-secondary",
        gold: "border-transparent bg-amber-500/10 hover:bg-amber-500/20 text-amber-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
