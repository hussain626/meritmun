"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  /** Optional second line under the label. */
  hint?: string;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Shared id prefix. Pass the SAME string to every matching <TabPanel>. */
  idBase: string;
  className?: string;
};

/**
 * Roving-tabindex tablist. Only one tab is in the tab order; arrow keys move
 * between them, which is what a screen-reader user expects from a tablist.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  label,
  idBase,
  className,
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    const next = tabs[(index + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    const node = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${next.id}"]`,
    );
    node?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(tabs.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-1.5",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.id}`}
            data-tab-id={tab.id}
            aria-selected={isSelected}
            aria-controls={`${idBase}-panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 text-left transition-colors duration-[var(--dur-fast)] ease-out",
              "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
              isSelected
                ? "bg-brand text-on-brand"
                : "text-fg-muted hover:bg-surface-raised hover:text-fg",
            )}
          >
            <span className="block text-sm font-semibold">{tab.label}</span>
            {tab.hint ? (
              <span
                className={cn(
                  "mt-0.5 block text-xs",
                  isSelected ? "text-on-brand/80" : "text-fg-faint",
                )}
              >
                {tab.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = {
  /** Must match the `idBase` passed to the Tabs instance. */
  idBase: string;
  tabId: string;
  className?: string;
  children: React.ReactNode;
};

export function TabPanel({ idBase, tabId, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${tabId}`}
      aria-labelledby={`${idBase}-tab-${tabId}`}
      tabIndex={0}
      className={cn("focus-visible:outline-2 focus-visible:outline-focus", className)}
    >
      {children}
    </div>
  );
}
