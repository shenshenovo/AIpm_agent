"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/capability-profile", label: "能力档案" },
  { href: "/jd-analysis", label: "JD分析" },
  { href: "/learning-plan", label: "学习计划" },
  { href: "/interview-training", label: "面试训练" }
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-8 lg:px-16">
        <div className="flex items-center gap-3 text-sm text-ink">
          <div className="grid h-5 w-5 place-items-center border border-line text-[10px] text-muted">
            AI
          </div>
          <span className="whitespace-nowrap">AI产品经理求职陪练Agent</span>
        </div>
        <nav className="flex flex-wrap items-center gap-6 text-sm text-muted">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative pb-2 transition-colors ${
                  isActive ? "text-ink" : "hover:text-ink"
                }`}
              >
                {item.label}
                <span
                  className={`absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-ink transition-all ${
                    isActive ? "w-8 opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
