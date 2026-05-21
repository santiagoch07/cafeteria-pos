import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "accent" | "success" | "error";

const variants: Record<Variant, string> = {
  default: "bg-surface-2 text-text",
  accent:  "bg-accent text-black font-medium",
  success: "bg-success/20 text-success",
  error:   "bg-error/20 text-error",
};

type Props = HTMLAttributes<HTMLSpanElement> & { variant?: Variant };

export default function Badge({ variant = "default", className, children, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs transition-colors duration-150",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
