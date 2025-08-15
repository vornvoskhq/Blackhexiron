import * as React from "react";
import { cn } from "../utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "glitch";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "px-6 py-3 rounded-lg font-mono text-lg transition-all",
          variant === "glitch"
            ? "bg-antarctica-glitch text-antarctica-black shadow-lg hover:scale-105"
            : "bg-antarctica-blue text-antarctica-dark hover:bg-antarctica-frost",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";