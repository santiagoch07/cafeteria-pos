import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black font-medium hover:bg-accent-2 active:scale-[0.98] focus-visible:ring-accent",
  secondary:
    "bg-surface border border-border text-text hover:border-border-hi focus-visible:ring-accent",
  ghost:
    "bg-transparent text-text hover:bg-surface-2 focus-visible:ring-accent",
  danger:
    "bg-error text-black font-medium hover:opacity-90 active:scale-[0.98] focus-visible:ring-error",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-5 text-base rounded-lg",
  lg: "h-14 px-6 text-base rounded-lg",
  xl: "h-16 px-8 text-lg rounded-lg min-h-[60px]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "secondary", size = "md", className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
