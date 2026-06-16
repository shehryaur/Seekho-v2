"use client";

/**
 * components/AppShellNav.tsx
 *
 * Top-mounted glass nav with an oversized logo anchored INTO the bar.
 * The logo intentionally breaks the nav border slightly, while the nav
 * hides on scroll down and reappears on scroll up.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Home,
  Map,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Roadmap", icon: Map },
  { href: "/week", label: "Plan My Week", icon: CalendarRange },
  { href: "/how-to-use", label: "How to Use", icon: BookOpen },
];

export function AppShellNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 16) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current + 8) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div aria-hidden className="h-[108px] sm:h-[120px] lg:h-[132px]" />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="seekho-glass-nav seekho-glass-nav-docked">
          <div className="flex min-h-[90px] w-full flex-col gap-3 px-3 py-2 sm:min-h-[102px] sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:min-h-[114px] lg:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link
                href="/"
                aria-label="Seekho Engine — Home"
                className="seekho-logo-overlap seekho-logo-in-nav"
              >
                <img
                  src="https://i.ibb.co/k2wpwPfV/download.png"
                  alt="Seekho Engine"
                />
              </Link>

              <div className="hidden min-w-0 leading-tight sm:block">
                <div className="truncate text-base font-semibold tracking-tight text-emerald-900 lg:text-lg">
                  Seekho Engine
                </div>
                <div className="truncate text-xs text-emerald-900/60 lg:text-sm">
                  PCTB-aligned lesson planning for Punjab schools
                </div>
              </div>
            </div>

            <nav className="flex flex-1 flex-wrap items-center gap-1.5 sm:justify-center">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "seekho-nav-link",
                      active && "seekho-nav-link-active",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:justify-end">
              
              <Link href="/#lesson-generator" className="seekho-btn-primary">
                <Sparkles className="h-4 w-4" />
                Generate now
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
