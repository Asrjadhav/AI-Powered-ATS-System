import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { DirectoryPerson } from "../../types";
import { DirectoryRepository } from "../../repositories/directoryRepository";

/**
 * The people who can be picked as interviewer, CC or BCC, loaded once from the backend and
 * shared by every picker on the page.
 */
let peoplePromise: Promise<DirectoryPerson[]> | null = null;

export function useDirectoryPeople() {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!peoplePromise) peoplePromise = DirectoryRepository.getPeople();
    peoplePromise
      .then((list) => !cancelled && setPeople(list))
      .catch((err: any) => {
        peoplePromise = null; // let the next open retry
        if (!cancelled) setError(err?.message || "Failed to load the people list.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { people, loading, error };
}

export interface PeopleMultiSelectProps {
  options: DirectoryPerson[];
  selected: DirectoryPerson[];
  onChange: (people: DirectoryPerson[]) => void;
  /** People already chosen in another field (e.g. CC while editing BCC): hidden from the list. */
  excludeIds?: string[];
  placeholder?: string;
  loading?: boolean;
  /** Shown instead of the list when the people could not be loaded. */
  error?: string;
  /** Red border: a required field that is still empty. */
  invalid?: boolean;
  "aria-label": string;
  /** Classes for the control itself (border, background, text) so it matches the surrounding form. */
  className?: string;
}

const PANEL_GAP = 4;
const PANEL_MARGIN = 8;
const PANEL_MAX_HEIGHT = 288;

export function PeopleMultiSelect({
  options,
  selected,
  onChange,
  excludeIds = [],
  placeholder = "Select people...",
  loading = false,
  error = "",
  invalid = false,
  "aria-label": ariaLabel,
  className = "",
}: PeopleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `${useId()}-list`;

  const available = useMemo(() => {
    const taken = new Set([...selected.map((p) => p.id), ...excludeIds]);
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return options.filter((p) => {
      if (taken.has(p.id)) return false;
      const haystack = `${p.name} ${p.email} ${p.role || ""}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [options, selected, excludeIds, query]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const add = (person: DirectoryPerson) => {
    onChange([...selected, person]);
    setQuery("");
    inputRef.current?.focus(); // stay open so several people can be added in a row
  };
  const remove = (id: string) => onChange(selected.filter((p) => p.id !== id));

  // Place the panel under the control (or above it when there is no room), outside any scrolling parent.
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 240), vw - PANEL_MARGIN * 2);
    const left = Math.max(PANEL_MARGIN, Math.min(rect.left, vw - width - PANEL_MARGIN));
    const spaceBelow = vh - rect.bottom - PANEL_GAP - PANEL_MARGIN;
    const spaceAbove = rect.top - PANEL_GAP - PANEL_MARGIN;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(PANEL_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
    setPanelStyle(
      openUp
        ? { position: "fixed", left, width, bottom: vh - rect.top + PANEL_GAP, maxHeight, zIndex: 10000 }
        : { position: "fixed", left, width, top: rect.bottom + PANEL_GAP, maxHeight, zIndex: 10000 }
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    reposition();
    const onScroll = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      reposition();
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, reposition, selected.length]); // chips can wrap onto a new line and move the control's bottom edge

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closePanel();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (open && panelStyle) inputRef.current?.focus();
  }, [open, panelStyle !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    (listRef.current?.children[activeIndex] as HTMLElement | undefined)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (available.length) setActiveIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + available.length) % available.length);
    } else if (e.key === "Enter") {
      e.preventDefault(); // never submit the surrounding form from the search box
      if (available[activeIndex]) add(available[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      closePanel();
    } else if (e.key === "Backspace" && !query && selected.length) {
      remove(selected[selected.length - 1].id);
    }
  };

  const panel =
    open && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-normal normal-case tracking-normal text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="relative border-b border-slate-100 p-2 dark:border-slate-800">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by name, email or role..."
                aria-label={`Search ${ariaLabel}`}
                aria-controls={listId}
                autoComplete="off"
                spellCheck={false}
                className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <ul id={listId} ref={listRef} role="listbox" aria-multiselectable="true" aria-label={ariaLabel} className={`min-h-0 flex-1 overflow-y-auto py-1 ${available.length ? "" : "hidden"}`}>
              {available.map((person, i) => (
                <li
                  key={person.id}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(person)}
                  onMouseMove={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${i === activeIndex ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{person.name}</span>
                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {person.email}
                      {person.role ? ` · ${person.role}` : ""}
                    </span>
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </li>
              ))}
            </ul>
            {!available.length && (
              <div className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                {loading
                  ? "Loading people..."
                  : error
                    ? error
                    : query.trim()
                      ? `No one matches “${query.trim()}”`
                      : options.length
                        ? "Everyone available is already selected"
                        : "No people available"}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? closePanel() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`relative flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-1.5 py-1.5 pl-2.5 pr-8 text-left ${
          invalid ? "!border-rose-400" : ""
        } ${className}`}
      >
        {selected.map((person) => (
          <span
            key={person.id}
            title={person.email}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-200/80 py-0.5 pl-2 pr-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <span className="truncate">{person.name}</span>
            <button
              type="button"
              aria-label={`Remove ${person.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(person.id);
              }}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-300 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!selected.length && <span className="px-1 text-sm font-medium text-slate-400">{placeholder}</span>}
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
      {panel}
    </>
  );
}

export default PeopleMultiSelect;
