"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import {
  Terminal,
  Database,
  Activity,
  Cpu,
  Loader2,
  GitMerge,
  Timer,
  Fingerprint,
  Layers,
} from "lucide-react";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const handleExecute = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setOutput("");

    setOutput("Initialize semantic query...\n");
    setTimeout(() => setOutput((prev) => prev + "Cache Miss detected.\n"), 500);
    setTimeout(
      () =>
        setOutput(
          (prev) => prev + "Routing to primary LLM (llama-3.3-70b)...\n\n",
        ),
      1000,
    );
    setTimeout(() => {
      setOutput(
        (prev) =>
          prev +
          "Here is the generated response based on the context provided. ",
      );
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {/* GLOBAL NAVBAR */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <Terminal size={16} className="text-white" />
            </div>
            <h1 className="font-semibold tracking-tight text-lg">
              Memoria <span className="text-zinc-500 font-normal">Gateway</span>
            </h1>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-[1600px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-55px)]">
        <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 h-full">
          <form
            onSubmit={handleExecute}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-2xl flex flex-col transition-all focus-within:border-indigo-500/50 focus-within:bg-zinc-900/60"
          >
            <div className="flex items-center px-4 py-4 border-b border-zinc-800/50">
              <span className="text-indigo-400 font-mono mr-3">{">"}</span>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="Initialize semantic query..."
                className="w-full bg-transparent text-sm focus:outline-none text-zinc-100 placeholder:text-zinc-600 font-medium disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="ml-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-semibold tracking-wide rounded-md transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "EXECUTE"
                )}
              </button>
            </div>

            {/* DYNAMIC TAG RIBBON (METADATA) */}
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950/50 text-[11px] font-mono uppercase tracking-wider text-zinc-500 overflow-x-auto">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                <Cpu size={12} className="text-indigo-400" /> Llama-3.3-70b
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                <Database size={12} className="text-emerald-400" /> pgvector
                Active
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 text-zinc-300 border border-zinc-700/50">
                <Activity size={12} className="text-amber-400" /> Rate: 1/15
              </span>
            </div>
          </form>

          {/* STDOUT TERMINAL */}
          <div className="flex-1 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 overflow-y-auto relative font-sans text-sm text-zinc-300 leading-relaxed shadow-inner">
            {!output && !isGenerating ? (
              <span className="text-zinc-600 font-mono animate-pulse">
                -- awaiting standard input --
              </span>
            ) : (
              <div className="whitespace-pre-wrap">
                {output}
                {isGenerating && (
                  <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                )}
              </div>
            )}
            <div ref={outputEndRef} />
          </div>
        </section>

        <section className="col-span-1 lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
          {/* PIPELINE TRACE*/}
          <div className="flex-[3.5] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitMerge size={16} className="text-indigo-400" />
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">
                  Request Trace
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded tracking-tighter">
                REQ_8F2A9
              </span>
            </div>

            <div className="flex-1 border border-dashed border-zinc-800/80 bg-zinc-950/30 rounded-lg flex items-center justify-center text-zinc-600 text-xs font-mono">
              [ React Node Graph Placeholder ]
            </div>
          </div>

          {/*LATENCY & VELOCITY*/}
          <div className="flex-[3.5] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Timer size={16} className="text-emerald-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">
                Performance Metrics
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">
                  TTFT
                </div>
                <div className="text-xl font-semibold text-zinc-200">
                  245
                  <span className="text-xs text-zinc-500 ml-1 font-normal">
                    ms
                  </span>
                </div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">
                  Velocity
                </div>
                <div className="text-xl font-semibold text-zinc-200">
                  142
                  <span className="text-xs text-zinc-500 ml-1 font-normal">
                    T/s
                  </span>
                </div>
              </div>
            </div>

            {/* Sparkline*/}
            <div className="flex-1 border border-dashed border-zinc-800/80 bg-zinc-950/30 rounded-lg flex items-center justify-center text-zinc-600 text-xs font-mono">
              [ Recharts Latency Sparkline ]
            </div>
          </div>

          {/* SEMANTIC MEMORY */}
          <div className="flex-[3] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint size={16} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">
                Semantic Engine
              </h2>
            </div>

            <div className="flex gap-6 h-full items-center">
              {/* Circular Gauge */}
              <div className="aspect-square h-full max-h-32 border-2 border-dashed border-cyan-900/50 rounded-full flex items-center justify-center flex-col shrink-0">
                <span className="text-2xl font-bold text-cyan-400">94%</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">
                  Match
                </span>
              </div>

              {/* Vector Array */}
              <div className="flex-1 h-full border border-zinc-800/80 bg-zinc-950/50 rounded-lg p-4 overflow-hidden relative group">
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-2 flex items-center justify-between">
                  <span>Embedding Array</span>
                  <Layers size={10} />
                </div>
                <div className="text-[11px] text-zinc-600 font-mono break-all leading-relaxed line-clamp-6">
                  [0.0124, -0.0452, 0.8810, 0.1129, -0.9931, 0.3341, -0.0012,
                  0.5542, 0.1123, -0.4432, 0.221, -0.992, 0.112, 0.443,
                  -0.112...]
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
