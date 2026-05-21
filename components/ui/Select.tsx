import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

const Select = forwardRef<HTMLSelectElement, Props>(({ label, className, id, children, ...props }, ref) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "h-12 w-full rounded-lg border bg-surface px-4 text-base text-text",
          "border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
          "transition-all duration-150 appearance-none cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});

Select.displayName = "Select";
export default Select;
