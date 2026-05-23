import { useEffect, useState } from "react";

const KEY = "flowzint.theme";
export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    apply(saved);
    setTheme(saved);
  }, []);

  function apply(t: Theme) {
    const root = document.documentElement;
    if (t === "light") root.classList.add("light");
    else root.classList.remove("light");
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    localStorage.setItem(KEY, next);
  }

  return { theme, toggle };
}
