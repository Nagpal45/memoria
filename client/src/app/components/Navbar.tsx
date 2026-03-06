"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, BarChart3, Gauge } from "lucide-react";

const navItems = [
  { href: "/", label: "Playground", icon: Terminal },
  { href: "/telemetry", label: "Telemetry", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-3 max-w-[1800px] mx-auto">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 flex items-center justify-center group-hover:shadow-cyan-500/40 transition-shadow">
              <Gauge size={16} className="text-white" />
            </div>
            <h1 className="font-semibold tracking-tight text-lg">
              Memoria <span className="text-zinc-500 font-normal text-sm">v1.0</span>
            </h1>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase text-zinc-400">
          <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </header>
  );
}
