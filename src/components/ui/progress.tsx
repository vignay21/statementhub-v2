import * as React from "react";
import { cn } from "./button";

export function Progress({
  value = 0,
  className,
  barClassName,
}: {
  value?: number;
  className?: string;
  barClassName?: string;
}) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-800",
        className
      )}
    >
      <div
        className={cn(
          "h-full w-full flex-1 bg-indigo-500 transition-all duration-300",
          barClassName
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
