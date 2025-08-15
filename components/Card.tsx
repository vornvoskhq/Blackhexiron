import * as React from "react";
import { cn } from "../utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl bg-antarctica-slate/80 shadow-xl border border-antarctica-steel p-8",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";