import React, {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Drop-in replacement for a native <select> that adds a search box.
 *
 * It takes the same <option> children, `value`, `className`, `disabled` and `required`, and calls
 * `onChange` with an event-shaped object (`e.target.value`), so an existing
 * `onChange={(e) => setX(e.target.value)}` keeps working unchanged.
 */

interface ParsedOption {
  value: string;
  label: string;
  disabled: boolean;
}

export interface SearchableSelectProps {
  value: string | number | null | undefined;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  searchPlaceholder?: string;
}

function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children);
  return "";
}

function collectOptions(children: React.ReactNode, out: ParsedOption[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; disabled?: boolean; children?: React.ReactNode };
    if (child.type === "option") {
      const label = nodeText(props.children).replace(/\s+/g, " ").trim();
      out.push({
        value: props.value !== undefined && props.value !== null ? String(props.value) : label,
        label,
        disabled: !!props.disabled,
      });
    } else if (child.type === Fragment) {
      collectOptions(props.children, out);
    }
  });
}

const PANEL_GAP = 4;
const PANEL_MARGIN = 8;
const PANEL_MIN_WIDTH = 224;
const PANEL_MAX_HEIGHT = 320;

export function SearchableSelect({
  value,
  onChange,
  children,
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  "aria-label": ariaLabel,
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const options = useMemo(() => {
    const out: ParsedOption[] = [];
    collectOptions(children, out);
    return out;
  }, [children]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const stringValue = value === null || value === undefined ? "" : String(value);

  // A native <select> shows the first selectable option when `value` matches none of them.
  const selectedIndex = useMemo(() => {
    const exact = options.findIndex((o) => o.value === stringValue);
    if (exact >= 0) return exact;
    return options.findIndex((o) => !o.disabled);
  }, [options, stringValue]);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // A disabled option with an empty value is a "-- Choose --" placeholder: it is shown on the
  // trigger but is not a result worth listing.
  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !(option.disabled && option.value === ""))
      .filter(({ option }) => {
        if (!words.length) return true;
        const haystack = option.label.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
  }, [options, query]);

  const closePanel = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback((initialQuery = "") => {
    if (disabled) return;
    setQuery(initialQuery);
    setOpen(true);
  }, [disabled]);

  const choose = useCallback(
    (option: ParsedOption) => {
      if (option.disabled) return;
      closePanel(true);
      if (option.value === stringValue) return; // a native <select> does not fire change for the same value
      onChange?.({
        target: { value: option.value, name },
        currentTarget: { value: option.value, name },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    },
    [closePanel, onChange, stringValue, name]
  );

  // Place the panel under the trigger, or above it when there is no room below.
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, PANEL_MIN_WIDTH), vw - PANEL_MARGIN * 2);
    const left = Math.max(PANEL_MARGIN, Math.min(rect.left, vw - width - PANEL_MARGIN));
    const spaceBelow = vh - rect.bottom - PANEL_GAP - PANEL_MARGIN;
    const spaceAbove = rect.top - PANEL_GAP - PANEL_MARGIN;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(PANEL_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
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
    // Scrolling the page moves the trigger; scrolling the option list must not move the panel.
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
  }, [open, reposition]);

  // The panel mounts one render after `open`, once its position is known.
  const panelReady = open && panelStyle !== null;

  // Close on a pointer press anywhere outside the control and its panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closePanel(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (disabled && open) closePanel(false);
  }, [disabled, open, closePanel]);

  useEffect(() => {
    if (!panelReady) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [panelReady]);

  // Start on the current selection; while searching, start on the first match. Reads the latest
  // list through a ref so a parent re-render (new `children` identity) does not reset navigation.
  const latest = useRef({ visible, selectedIndex, options });
  latest.current = { visible, selectedIndex, options };
  useEffect(() => {
    if (!open) return;
    const { visible: list, selectedIndex: selected, options: all } = latest.current;
    const onSelected = query.trim()
      ? -1
      : list.findIndex(({ index }) => index === selected && !all[index].disabled);
    setActiveIndex(onSelected >= 0 ? onSelected : list.findIndex(({ option }) => !option.disabled));
  }, [open, query]);

  useEffect(() => {
    if (!panelReady || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: "nearest" });
  }, [panelReady, activeIndex]);

  const moveActive = (step: 1 | -1) => {
    const count = visible.length;
    if (!count) return;
    let next = activeIndex;
    for (let i = 0; i < count; i++) {
      next = (next + step + count) % count;
      if (!visible[next].option.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openPanel();
    } else if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type-ahead, like a native select: typing on the closed control opens it with that text.
      e.preventDefault();
      openPanel(e.key);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Enter":
        e.preventDefault(); // never submit a surrounding form from the search box
        if (activeIndex >= 0 && visible[activeIndex]) choose(visible[activeIndex].option);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closePanel(true);
        break;
      case "Tab":
        // The panel lives in <body>; hand focus back to the trigger so Tab continues from the form.
        closePanel(true);
        break;
    }
  };

  // Without a width utility a native select sizes itself to its widest option. Keep that by
  // stacking every label invisibly behind the visible one, so the control does not resize on change.
  const needsSizer = !/(^|\s)w-/.test(className) && options.length <= 40;
  // `appearance-none` is how callers say "I draw my own icon next to the select".
  const drawsOwnIcon = /(^|\s)appearance-none(\s|$)/.test(className);

  const activeOptionId = open && activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      id={id}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-label={ariaLabel}
      aria-required={required || undefined}
      disabled={disabled}
      onClick={() => (open ? closePanel(false) : openPanel())}
      onKeyDown={onTriggerKeyDown}
      className={`relative inline-flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${className}`}
      style={drawsOwnIcon ? undefined : { paddingRight: "2rem" }}
    >
      <span className="grid min-w-0 flex-1">
        <span className="col-start-1 row-start-1 truncate">{selectedOption?.label || " "}</span>
        {needsSizer &&
          options.map((o, i) => (
            <span key={i} aria-hidden="true" className="col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap invisible">
              {o.label}
            </span>
          ))}
      </span>
      {!drawsOwnIcon && (
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      )}
    </button>
  );

  const panel =
    open && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            // Portal events bubble through the React tree; keep them from reaching row/overlay handlers.
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
                placeholder={searchPlaceholder}
                aria-label={ariaLabel ? `Search ${ariaLabel}` : "Search options"}
                aria-controls={listId}
                aria-activedescendant={activeOptionId}
                autoComplete="off"
                spellCheck={false}
                className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className={`min-h-0 flex-1 overflow-y-auto py-1 ${visible.length ? "" : "hidden"}`}
            >
              {visible.map(({ option, index }, i) => {
                const isSelected = index === selectedIndex;
                const isActive = i === activeIndex;
                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`${uid}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    // Keep focus in the search box when an option is pressed.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    onMouseMove={() => !option.disabled && setActiveIndex(i)}
                    className={`flex cursor-pointer items-start gap-2 px-3 py-1.5 ${
                      option.disabled ? "cursor-not-allowed opacity-50" : ""
                    } ${isActive ? "bg-slate-100 dark:bg-slate-800" : ""} ${isSelected ? "font-semibold" : ""}`}
                  >
                    <span className="min-w-0 flex-1 break-words">{option.label}</span>
                    {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                  </li>
                );
              })}
            </ul>
            {!visible.length && (
              <div className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                No matching options{query.trim() ? ` for “${query.trim()}”` : ""}
              </div>
            )}
            <div className="sr-only" role="status" aria-live="polite">
              {visible.length ? `${visible.length} options available` : "No matching options"}
            </div>
          </div>,
          document.body
        )
      : null;

  const control = (
    <>
      {trigger}
      {panel}
    </>
  );

  // A <button> cannot be `required`. A transparent required input stacked on the trigger keeps the
  // browser's native "Please select an item" validation for forms that rely on it.
  if (required) {
    return (
      <div className="relative">
        {control}
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          name={name}
          value={stringValue}
          onChange={() => {}}
          // On a failed submit the browser focuses this input; move focus to the visible control.
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>
    );
  }

  return control;
}

export default SearchableSelect;
