import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };

const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ label, className, id, ...props }, ref) => {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full rounded-lg border bg-surface px-4 py-3 text-base text-text placeholder:text-muted",
          "border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
          "transition-all duration-150 resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
});

Textarea.displayName = "Textarea";
export default Textarea;
