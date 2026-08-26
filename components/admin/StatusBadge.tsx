import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn, titleCase } from "@/lib/utils";

export type PaymentStatus = "pending" | "confirmed" | "rejected";
export type AllotmentStatus = "draft" | "confirmed";
export type QueryStatus = "open" | "answered" | "archived";

type StatusKind = "payment" | "allotment" | "query";

type StatusBadgeProps = {
  kind: StatusKind;
  status: string;
  overdue?: boolean;
  className?: string;
};

const PAYMENT: Record<PaymentStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: "warning", label: "Pending Verification" },
  confirmed: { tone: "success", label: "Confirmed" },
  rejected: { tone: "danger", label: "Rejected" },
};

const ALLOTMENT: Record<AllotmentStatus, { tone: BadgeTone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  confirmed: { tone: "success", label: "Confirmed" },
};

const QUERY: Record<QueryStatus, { tone: BadgeTone; label: string }> = {
  open: { tone: "warning", label: "Open" },
  answered: { tone: "success", label: "Answered" },
  archived: { tone: "neutral", label: "Archived" },
};

function resolve(
  kind: StatusKind,
  status: string,
  overdue?: boolean,
): { tone: BadgeTone; label: string } {
  const key = status.toLowerCase();

  if (kind === "payment") {
    if (overdue && key === "pending") {
      return { tone: "danger", label: "Overdue" };
    }
    if (key in PAYMENT) {
      return PAYMENT[key as PaymentStatus];
    }
  }
  if (kind === "allotment" && key in ALLOTMENT) {
    return ALLOTMENT[key as AllotmentStatus];
  }
  if (kind === "query" && key in QUERY) {
    return QUERY[key as QueryStatus];
  }

  return { tone: "neutral", label: titleCase(status.replace(/_/g, " ")) };
}

export function StatusBadge({
  kind,
  status,
  overdue,
  className,
}: StatusBadgeProps) {
  const resolved = resolve(kind, status, overdue);

  return (
    <Badge
      tone={resolved.tone}
      size="sm"
      className={cn("uppercase tracking-wide", className)}
    >
      {resolved.label}
    </Badge>
  );
}
