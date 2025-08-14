// Utility for conditional class names (like shadcn/ui)
export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}