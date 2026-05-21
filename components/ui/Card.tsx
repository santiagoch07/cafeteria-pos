import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  selected?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  interactive,
  selected,
  padding = "md",
  className,
  children,
  ...props
}: Props) {
  return (
    <div
      className={cn(
        "bg-surface border rounded-xl transition-all duration-150",
        selected ? "border-accent" : "border-border",
        interactive &&
          "cursor-pointer hover:border-accent",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
