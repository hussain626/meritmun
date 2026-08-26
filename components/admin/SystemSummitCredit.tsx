import Image from "next/image";
import { cn } from "@/lib/utils";
import systemSummitLogo from "@/public/systemsummit-logo.png";

type SystemSummitCreditProps = {
  className?: string;
};

export function SystemSummitCredit({ className }: SystemSummitCreditProps) {
  return (
    <a
      href="https://systemsummit.online"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-sm",
        "transition-opacity duration-[var(--dur-fast)] ease-out hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
        className,
      )}
    >
      <span className="text-xs font-medium tracking-wide">Powered by</span>
      <Image
        src={systemSummitLogo}
        alt="SystemSummit"
        className="h-7 w-auto rounded-xs object-contain"
      />
    </a>
  );
}
