
import { cn } from "@/lib/utils";

export const AppLogo = ({ className }: { className?: string}) => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <circle cx="12" cy="7" r="2.5" fill="currentColor" />
      <path
        d="M9.5 11C9.5 10.1716 10.1716 9.5 11 9.5H13C13.8284 9.5 14.5 10.1716 14.5 11V12H9.5V11Z"
        fill="hsl(var(--primary-foreground))"
        className="group-data-[auth-layout]:fill-black"
      />
      <path d="M12 9.5L11.5 12H12.5L12 9.5Z" fill="hsl(var(--primary))" />
      <rect x="4" y="15" width="16" height="2" rx="1" fill="hsl(var(--primary-foreground))" className="group-data-[auth-layout]:fill-black" />
      <rect x="6.5" y="13" width="3" height="2" fill="hsl(var(--primary-foreground))" className="group-data-[auth-layout]:fill-black" />
      <rect x="5" y="9" width="6" height="4" rx="1" fill="hsl(var(--primary-foreground))" className="group-data-[auth-layout]:fill-black" />
    </svg>
)
