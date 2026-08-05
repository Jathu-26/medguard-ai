"use client";

import React, { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-600 text-white shadow-sm",
        secondary:
          "border-transparent bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
        teal:
          "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
        destructive:
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        outline:
          "text-foreground border-slate-300 dark:border-slate-700",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        sky:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
