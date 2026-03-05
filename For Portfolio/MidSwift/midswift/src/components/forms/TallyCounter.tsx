"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  UIEvent,
  ChangeEvent,
  FormEvent,
  CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Hash } from "lucide-react";

// I'm defining what this component needs to function: a label, a starting value,
// and a way to tell the parent when that value changes.
interface TallyCounterProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
}

// I'm setting these constants here so I don't have "magic numbers" floating around.
// We're handling 5000 items, but only showing 5 at a time to keep the UI clean.
const MAX_LIMIT = 5000;
const TOTAL_ITEMS = MAX_LIMIT + 1;
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export function TallyCounter({ label, value, onChange }: TallyCounterProps) {
  // I need to track if we're mounted to avoid SSR errors with Portals,
  // and manage the dropdown state and scroll position for our virtual list.
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [isDropup, setIsDropup] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});

  // I'm using these refs to grab the actual DOM elements for positioning and focus management.
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Once the component hits the browser, I'll flip this switch so Portals can render safely.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Whenever the 'value' prop changes from the outside, I make sure the input text stays in sync.
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // This is where I handle the "smart positioning." If there's no room below,
  // I calculate the math to flip the menu upward so it doesn't go off-screen.
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;

      const shouldDropup =
        spaceBelow < CONTAINER_HEIGHT + 20 && spaceAbove > spaceBelow;
      setIsDropup(shouldDropup);

      const top = shouldDropup
        ? rect.top - CONTAINER_HEIGHT - 8
        : rect.bottom + 8;

      setDropdownStyles({
        position: "fixed",
        top,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // I'm adding listeners to the whole document here. If I click or tap away
  // from the input or the menu, I want the dropdown to close automatically.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        scrollContainerRef.current &&
        !scrollContainerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // When the menu opens, I want to automatically scroll the list to the current value
  // so the user doesn't have to hunt for their current selection.
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const safeValue = Math.max(0, Math.min(value, MAX_LIMIT));
      const scrollPosition = safeValue * ITEM_HEIGHT;
      scrollContainerRef.current.scrollTop = scrollPosition;
      setScrollTop(scrollPosition);
    }
  }, [isOpen, value]);

  // When a user clicks a number in the list, I update the state and close the menu.
  const handleSelect = useCallback(
    (num: number) => {
      onChange(num);
      setInputValue(num.toString());
      setIsOpen(false);
    },
    [onChange],
  );

  // I'm filtering the input here to make sure only digits get typed.
  // If it's a valid number, I push that change up to the parent immediately.
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    setInputValue(val);
    setIsOpen(true);

    if (val !== "") {
      const num = parseInt(val, 10);
      if (num <= MAX_LIMIT) onChange(num);
    }
  };

  // If the user clicks away, I check if the input is empty or invalid.
  // If it is, I reset it to the last "good" value we had.
  const handleBlur = () => {
    if (inputValue === "" || parseInt(inputValue, 10) > MAX_LIMIT) {
      setInputValue(value.toString());
    }

    // I'm using a tiny delay here because on mobile, the "activeElement"
    // takes a millisecond to update. This prevents the menu from snapping shut too early.
    setTimeout(() => {
      const activeEl = document.activeElement;
      if (
        activeEl !== inputRef.current &&
        (!dropdownRef.current || !dropdownRef.current.contains(activeEl)) &&
        (!scrollContainerRef.current ||
          !scrollContainerRef.current.contains(activeEl))
      ) {
        setIsOpen(false);
      }
    }, 10);
  };

  // Just a simple way to track how far we've scrolled so the virtual list knows what to render.
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // By wrapping the input in a form, I can catch the "Enter" or "Done" key
  // on mobile keyboards naturally. I'll validate the number and then close the menu.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isOpen) {
      let num: number;
      if (inputValue === "") {
        num = value;
      } else {
        num = Math.max(0, Math.min(parseInt(inputValue, 10), MAX_LIMIT));
      }

      onChange(num);
      setInputValue(num.toString());
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // This is the "Virtualization" logic. Instead of rendering 5000 divs (which would lag),
  // I only render the ones currently visible in the scroll window (plus a small buffer).
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
  const endIndex = Math.min(
    TOTAL_ITEMS - 1,
    Math.floor((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + 2,
  );

  const visibleItems: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(i);
  }

  const hasLabel = label && label.trim() !== "";

  return (
    <div className="flex items-center gap-2 p-2 sm:p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group/container w-full overflow-visible">
      {hasLabel && (
        <div className="flex items-center gap-1.5 text-slate-600 group-focus-within/container:text-blue-600 transition-colors min-w-0 flex-1">
          <Hash className="w-4 h-4 opacity-40 shrink-0" />
          <span className="font-bold text-sm uppercase tracking-tight truncate">
            {label}
          </span>
        </div>
      )}

      <div
        ref={dropdownRef}
        className={`relative ${hasLabel ? "shrink-0 w-28" : "w-full"}`}
      >
        <form
          onSubmit={handleSubmit}
          className={`relative flex items-center w-full h-11 bg-slate-50 border-2 rounded-xl transition-all duration-200 ${
            isOpen
              ? "border-blue-500 ring-4 ring-blue-50 bg-white"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            className="w-full h-full px-3 text-xl font-black text-center text-slate-800 tabular-nums bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) setTimeout(() => inputRef.current?.focus(), 10);
            }}
            className="pr-2 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
            tabIndex={-1}
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </form>

        {mounted &&
          createPortal(
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                ...dropdownStyles,
                maxHeight: `${CONTAINER_HEIGHT}px`,
              }}
              className={`bg-white border border-slate-200 rounded-xl shadow-2xl overflow-y-auto transition-all duration-300 ease-out ${
                isOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-2 pointer-events-none"
              }`}
            >
              <div
                style={{
                  height: `${TOTAL_ITEMS * ITEM_HEIGHT}px`,
                  position: "relative",
                }}
              >
                {visibleItems.map((num) => {
                  const isSelected = value === num;
                  return (
                    <div
                      key={num}
                      className={`absolute w-full px-3 py-2 text-center text-lg cursor-pointer transition-all duration-100 flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 font-black text-white"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      style={{
                        height: `${ITEM_HEIGHT}px`,
                        top: `${num * ITEM_HEIGHT}px`,
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(num)}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
