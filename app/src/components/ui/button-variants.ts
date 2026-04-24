import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "light-destructive":
          "bg-destructive/10 text-destructive hover:bg-destructive/15 text-destructive/80 hover:text-destructive",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-10 rounded-md px-4",
        thin: "h-9 rounded-md px-3.5 text-sm",
        xs: "h-8 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-md": "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "flex-icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
        "p-xs": "p-1",
        "default-sm": "h-8 px-3",
        "default-lg": "h-9 px-6",
        "default-xs": "h-7 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
