"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

/** Switches the public site between dark (default) and light. The choice is remembered on this device. */
export function ThemeToggle({ className, withLabel = false, bare = false }: { className?: string; withLabel?: boolean; bare?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  const next: Theme = theme === "light" ? "dark" : "light";
  const apply = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lnh-theme", next); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#F4F8FC" : "#040B1E");
    setTheme(next);
  };
  return (
    <button type="button" onClick={apply} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full text-white transition", bare ? "h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white" : cn("h-10 border border-white/15 hover:border-lnh-sky", withLabel ? "px-4 text-sm font-semibold" : "w-10"), className)}>
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {withLabel && <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
