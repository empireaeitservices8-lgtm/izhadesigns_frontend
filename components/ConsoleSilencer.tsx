"use client";

import { useEffect } from "react";

export default function ConsoleSilencer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const noop = () => {};
    const rawClear =
      window.console && typeof window.console.clear === "function"
        ? window.console.clear.bind(window.console)
        : noop;

    const methods = [
      "log",
      "debug",
      "info",
      "warn",
      "error",
      "assert",
      "dir",
      "dirxml",
      "group",
      "groupCollapsed",
      "groupEnd",
      "time",
      "timeEnd",
      "timeLog",
      "trace",
      "table",
      "count",
      "countReset",
    ];

    methods.forEach((m) => {
      try {
        Object.defineProperty(window.console, m, {
          get: () => noop,
          set: () => {},
          configurable: true,
        });
      } catch (_) {
        try {
          (window.console as any)[m] = noop;
        } catch (__) {}
      }
    });

    const suppress = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        rawClear();
      } catch (_) {}
      return true;
    };

    window.addEventListener("error", suppress, true);
    window.addEventListener("unhandledrejection", suppress, true);

    const intervalId = setInterval(() => {
      try {
        rawClear();
      } catch (_) {}
    }, 1500);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("error", suppress, true);
      window.removeEventListener("unhandledrejection", suppress, true);
    };
  }, []);

  return null;
}
