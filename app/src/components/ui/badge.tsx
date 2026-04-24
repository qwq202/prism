import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./lib/utils";
import { badgeVariants } from "@/components/ui/badge-variants.ts";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export type BadgeVariants = keyof ReturnType<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
