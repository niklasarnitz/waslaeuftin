import { cn } from "@waslaeuftin/lib/utils";

type Tone = "running" | "success" | "failed" | "idle";

const toneClasses: Record<Tone, string> = {
  running: "bg-blue-500",
  success: "bg-emerald-500",
  failed: "bg-red-500",
  idle: "bg-slate-400",
};

export const ProgressBar = ({
  value,
  tone,
  indeterminate = false,
  className,
}: {
  /** 0..1 */
  value: number;
  tone: Tone;
  indeterminate?: boolean;
  className?: string;
}) => {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percent}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          toneClasses[tone],
          indeterminate && "animate-pulse",
        )}
        style={{ width: `${indeterminate ? 100 : percent}%` }}
      />
    </div>
  );
};
