"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Terminal, BarChart3, Gauge, Loader2 } from "lucide-react";

const navItems = [
  { href: "/", label: "Playground", icon: Terminal },
  { href: "/telemetry", label: "Telemetry", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNav = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

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
                <button
                  key={href}
                  onClick={() => handleNav(href)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
            {isPending && (
              <Loader2 size={14} className="text-cyan-500 animate-spin ml-2" />
            )}
          </nav>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase text-zinc-400">
          <SystemStatus />
        </div>
      </div>
    </header>
  );
}

function SystemStatus() {
  const [load, setLoad] = useState(12);
  const [ping, setPing] = useState(45);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoad((prev) => Math.max(5, Math.min(85, prev + (Math.random() * 8 - 4))));
      setPing((prev) => Math.max(20, Math.min(150, prev + (Math.random() * 20 - 10))));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-zinc-200 font-medium">SYS_OK</span>
      </div>
      <div className="w-[1px] h-3 bg-zinc-800" />
      <span className="text-zinc-400 font-medium whitespace-nowrap">LOAD: {load.toFixed(1)}%</span>
      <div className="w-[1px] h-3 bg-zinc-800" />
      <span className="text-zinc-400 font-medium whitespace-nowrap">{ping.toFixed(0)}mS</span>
      <div className="w-[1px] h-3 bg-zinc-800" />
      <span className="text-cyan-500/80 font-medium whitespace-nowrap">15 REQ/MIN</span>
    </span>
  );
}