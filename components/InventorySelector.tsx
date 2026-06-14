"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

const PRESET_ITEMS = [
  "Chalk",
  "Whiteboard marker",
  "Paper",
  "Notebooks",
  "Pencils / pens",
  "String / thread",
  "Plastic bottles",
  "Stones / pebbles",
  "Leaves",
  "Dirt / sand",
  "Rubber bands",
  "Cardboard scraps",
  "Newspaper",
  "Bottle caps",
  "Beans / lentils",
] as const;

export interface InventorySelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function InventorySelector({
  value,
  onChange,
  disabled,
}: InventorySelectorProps) {
  const [draft, setDraft] = React.useState("");

  const toggle = (item: string) => {
    if (value.includes(item))
      onChange(value.filter((entry) => entry !== item));
    else onChange([...value, item]);
  };

  return (
    <div className="rounded-2xl border border-brown/25 bg-cream/85 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Classroom Inventory
          </h3>
          <p className="text-xs text-ink/70">
            Seekho Engine will only use the exact items you select here.
          </p>
        </div>
        <span className="rounded-full bg-olive/15 px-3 py-1 text-xs font-medium text-brand">
          {value.length} items selected
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRESET_ITEMS.map((item) => {
          const checked = value.includes(item);
          return (
            <label
              key={item}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${checked ? "border-brand bg-olive/15 text-brand" : "border-brown/25 bg-cream text-ink hover:bg-olive/10"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(item)}
                disabled={disabled}
                className="h-4 w-4 rounded border-brown/40 text-brand accent-brand"
              />
              <span>{item}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const next = draft.trim();
              if (next && !value.includes(next))
                onChange([...value, next]);
              setDraft("");
            }
          }}
          placeholder="Add another item..."
          className="seekho-input"
        />
        <button
          type="button"
          onClick={() => {
            const next = draft.trim();
            if (next && !value.includes(next)) onChange([...value, next]);
            setDraft("");
          }}
          disabled={disabled || !draft.trim()}
          className="inline-flex h-11 items-center gap-1 rounded-lg border border-brown/30 bg-cream px-4 text-sm font-medium text-ink shadow-sm hover:bg-olive/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-olive/20 px-3 py-1 text-xs font-medium text-brand"
            >
              {item}
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((entry) => entry !== item))
                }
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
