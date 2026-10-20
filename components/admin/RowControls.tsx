"use client";

import { ChevronDown } from "@/components/icons/ChevronDown";
import { Close } from "@/components/icons/Close";
import { Pencil } from "@/components/icons/Pencil";
import { cn } from "@/lib/utils";

type RowControlsProps = {
  /** Read aloud with every control, e.g. the member's name. */
  label: string;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
};

const BUTTON = cn(
  "grid size-8 place-items-center rounded-sm text-fg-muted",
  "transition-colors duration-[var(--dur-fast)] hover:bg-surface-inset hover:text-fg",
  "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
  "disabled:pointer-events-none disabled:opacity-40",
);

/** Edit / reorder / delete for one row of an admin list. */
export function RowControls({
  label,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
  disabled = false,
}: RowControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {onEdit ? (
        <button
          type="button"
          className={BUTTON}
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Edit ${label}`}
          title="Edit"
        >
          <Pencil className="size-4" />
        </button>
      ) : null}
      {onMoveUp ? (
        <button
          type="button"
          className={BUTTON}
          onClick={onMoveUp}
          disabled={disabled}
          aria-label={`Move ${label} up`}
          title="Move up"
        >
          <ChevronDown className="size-4 rotate-180" />
        </button>
      ) : null}
      {onMoveDown ? (
        <button
          type="button"
          className={BUTTON}
          onClick={onMoveDown}
          disabled={disabled}
          aria-label={`Move ${label} down`}
          title="Move down"
        >
          <ChevronDown className="size-4" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className={cn(BUTTON, "hover:text-danger-fg")}
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete ${label}`}
          title="Delete"
        >
          <Close className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
