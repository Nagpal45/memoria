"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Terminal, Database, Cpu, Loader2, Timer, Fingerprint, Layers, ShieldCheck, Zap, BrainCircuit, GitMerge
} from "lucide-react";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // --- TELEMETRY STATE ---
  const [source, setSource] = useState<string>("WAITING...");
  const [ttft, setTtft] = useState<number>(0);
  const [velocity, setVelocity] = useState<number>(0);
  const [similarity, setSimilarity] = useState<number>(0);
  const [vector, setVector] = useState<number[]>([]);

  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const handleExecute = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setOutput("");
    setSource("ROUTING...");
    setTtft(0);
    setVelocity(0);
    setSimilarity(0);
    setVector([]);

    const reqStartTime = Date.now();
    let tokenCount = 0;

    try {
      const res = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Gateway failed to respond.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6);
              if (dataStr === "[DONE]") {
                setIsGenerating(false);
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.event === "metadata") {
                  setTtft(Date.now() - reqStartTime);
                  setSource(parsed.source);
                  if (parsed.similarity) setSimilarity(parsed.similarity);
                  if (parsed.vector) setVector(parsed.vector);
                } 
                else if (parsed.text) {
                  setOutput((prev) => prev + parsed.text);
                  tokenCount++;
                  const elapsedSeconds = (Date.now() - reqStartTime) / 1000;
                  if (elapsedSeconds > 0) {
                    setVelocity(Math.round(tokenCount / elapsedSeconds));
                  }
                }
              } catch (err) {
                console.error("SSE Parse Error:", dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setOutput((prev) => prev + "\n\n[SYS_ERROR] Connection to Gateway Failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isCacheHit = source.includes("cache");
  const displaySource = source === "redis_cache" ? "L1: Redis Exact" 
                      : source === "postgres_semantic_cache" ? "L2: pgvector" 
                      : source.replace("llm_generated_", "LLM: ");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/30">
      {/* GLOBAL NAVBAR */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-cyan-600 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <Terminal size={16} className="text-white" />
            </div>
            <h1 className="font-semibold tracking-tight text-lg">
              Memoria <span className="text-zinc-500 font-normal">Gateway</span>
            </h1>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SYS.ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* 3-COLUMN MAIN LAYOUT */}
      <main className="max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-55px)]">
        
        {/* ========================================= */}
        {/* LEFT PANEL: THE ANIMATED TRACE TREE (3 Cols)*/}
        {/* ========================================= */}
        <section className="col-span-1 lg:col-span-3 flex flex-col h-full overflow-hidden">
          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col relative">
            <div className="flex items-center gap-2 mb-8 z-10">
              <GitMerge size={16} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">Execution Tree</h2>
            </div>
            {/* The Framer Motion Tree Component */}
            <div className="flex-1 w-full relative">
              <ExecutionTree source={source} />
            </div>
          </div>
        </section>

        {/* ========================================= */}
        {/* CENTER PANEL: THE PLAYGROUND (6 Cols)     */}
        {/* ========================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-4 h-full">
          <form
            onSubmit={handleExecute}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-2xl flex flex-col transition-all focus-within:border-cyan-500/50 focus-within:bg-zinc-900/60"
          >
            <div className="flex items-center px-4 py-4 border-b border-zinc-800/50">
              <span className="text-cyan-400 font-mono mr-3">{">"}</span>
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
                className="ml-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold tracking-widest rounded-md transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/10"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : "EXEC"}
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950/50 text-[10px] font-mono uppercase tracking-wider text-zinc-500 overflow-x-auto">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50">
                <Cpu size={12} className={isCacheHit ? "text-zinc-500" : "text-cyan-400"} /> 
                {source.includes("llm") ? displaySource : "LLM Standby"}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50">
                <Database size={12} className={source.includes("cache") ? "text-emerald-400" : "text-zinc-500"} /> 
                {source.includes("cache") ? displaySource : "Cache Standby"}
              </span>
            </div>
          </form>

          {/* STDOUT */}
          <div className="flex-1 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 overflow-y-auto relative font-sans text-sm text-zinc-300 leading-relaxed shadow-inner custom-scrollbar">
            {!output && !isGenerating ? (
              <span className="text-zinc-600 font-mono animate-pulse"># Awaiting standard input</span>
            ) : (
              <div className="whitespace-pre-wrap">
                {output}
                {isGenerating && (
                  <span className="inline-block w-2 h-4 ml-1 bg-cyan-500 animate-pulse align-middle" />
                )}
              </div>
            )}
            <div ref={outputEndRef} />
          </div>
        </section>

        {/* ========================================= */}
        {/* RIGHT PANEL: METRICS & VECTOR (3 Cols)    */}
        {/* ========================================= */}
        <section className="col-span-1 lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* LATENCY & VELOCITY */}
          <div className="flex-[4] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-5">
              <Timer size={16} className="text-emerald-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">Telemetry</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 flex flex-col justify-center">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1">TTFT</div>
                <div className="text-2xl font-bold text-zinc-200">
                  {ttft} <span className="text-[10px] text-zinc-500 ml-0.5 font-normal tracking-widest">MS</span>
                </div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 flex flex-col justify-center">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1">Velocity</div>
                <div className="text-2xl font-bold text-zinc-200">
                  {velocity} <span className="text-[10px] text-zinc-500 ml-0.5 font-normal tracking-widest">T/S</span>
                </div>
              </div>
            </div>

            <div className="flex-1 border border-dashed border-zinc-800/80 bg-zinc-950/30 rounded-lg flex items-center justify-center text-zinc-600 text-[10px] font-mono">
              [ Sparkline Area ]
            </div>
          </div>

          {/* SEMANTIC MEMORY */}
          <div className="flex-[6] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-6">
              <Fingerprint size={16} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-100">Vector Engine</h2>
            </div>

            <div className="flex flex-col gap-6 h-full">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 border-2 border-dashed border-cyan-900/50 rounded-full flex items-center justify-center flex-col shrink-0 bg-zinc-950/50">
                  <span className="text-xl font-bold text-cyan-400">{similarity > 0 ? `${(similarity * 100).toFixed(0)}%` : "--"}</span>
                </div>
                <div>
                   <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-1">Semantic Match</div>
                   <div className="text-[10px] text-zinc-600 leading-tight">Cosine similarity calculated via pgvector</div>
                </div>
              </div>

              <div className="flex-1 border border-zinc-800/80 bg-zinc-950/50 rounded-lg p-4 overflow-hidden relative flex flex-col">
                <div className="text-[10px] text-zinc-500 font-mono uppercase mb-3 flex items-center justify-between">
                  <span>DIM_ARRAY[384]</span>
                  <Layers size={12} />
                </div>
                <div className="flex-1 text-[11px] text-zinc-600 font-mono break-all leading-relaxed overflow-y-auto custom-scrollbar">
                  {vector.length > 0 ? `[${vector.join(", ")}...]` : "[ Awaiting Generation ]"}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ==========================================
// THE ANIMATED EXECUTION TREE COMPONENT
// ==========================================
function ExecutionTree({ source }: { source: string }) {
  // Determine the state of each node based on the backend source
  const isStarted = source !== "WAITING...";
  
  const l1Hit = source === "redis_cache";
  const l1Miss = source === "postgres_semantic_cache" || source.includes("llm");
  const l1State = l1Hit ? "hit" : l1Miss ? "miss" : isStarted ? "evaluating" : "idle";

  const vdbHit = source === "postgres_semantic_cache" || source.includes("llm");
  const vdbState = vdbHit ? "active" : "idle";

  const l2Hit = source === "postgres_semantic_cache";
  const l2Miss = source.includes("llm");
  const l2State = l2Hit ? "hit" : l2Miss ? "miss" : "idle";

  const llmHit = source.includes("llm");
  const llmState = llmHit ? "hit" : "idle";

  return (
    <div className="w-full h-full relative flex flex-col justify-between items-center py-4">
      
      {/* BACKGROUND SVG LINES */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
        
        {/* Line 1: Gateway -> L1 */}
        <line x1="50%" y1="10%" x2="50%" y2="30%" stroke="#27272a" strokeWidth="2" />
        <motion.line x1="50%" y1="10%" x2="50%" y2="30%" stroke="#06b6d4" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isStarted ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Line 2: L1 -> Vector Embedder (Only if L1 Misses) */}
        <line x1="50%" y1="30%" x2="50%" y2="50%" stroke="#27272a" strokeWidth="2" />
        <motion.line x1="50%" y1="30%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: l1Miss ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeInOut" }}
        />

        {/* Line 3: Vector Embedder -> L2 */}
        <line x1="50%" y1="50%" x2="50%" y2="70%" stroke="#27272a" strokeWidth="2" />
        <motion.line x1="50%" y1="50%" x2="50%" y2="70%" stroke="#06b6d4" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: vdbHit ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeInOut" }}
        />

        {/* Line 4: L2 -> LLM Router (Only if L2 Misses) */}
        <line x1="50%" y1="70%" x2="50%" y2="90%" stroke="#27272a" strokeWidth="2" />
        <motion.line x1="50%" y1="70%" x2="50%" y2="90%" stroke="#06b6d4" strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: l2Miss ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.9, ease: "easeInOut" }}
        />
      </svg>

      {/* FOREGROUND HTML NODES */}
      <div className="z-10 w-full flex flex-col justify-between h-full relative">
        <TreeNode label="API Gateway" icon={ShieldCheck} state={isStarted ? "active" : "idle"} />
        <TreeNode label="L1 Exact Cache" icon={Zap} state={l1State} />
        <TreeNode label="Vector Embedder" icon={Layers} state={vdbState} />
        <TreeNode label="L2 Semantic Cache" icon={Database} state={l2State} />
        <TreeNode label="LLM Router" icon={BrainCircuit} state={llmState} />
      </div>

    </div>
  );
}

// --- TREE NODE SUB-COMPONENT ---
function TreeNode({ label, icon: Icon, state }: { label: string, icon: any, state: "idle" | "evaluating" | "hit" | "miss" | "active" }) {
  const styles = {
    idle: "bg-[#09090b] border-zinc-800 text-zinc-600",
    evaluating: "bg-cyan-950/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
    active: "bg-cyan-950/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
    hit: "bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    miss: "bg-[#09090b] border-zinc-800 text-zinc-500 opacity-60", // Fades out if bypassed/missed
  };

  const statusText = {
    idle: "STANDBY",
    evaluating: "ROUTING...",
    active: "EXECUTED",
    hit: "CACHE HIT",
    miss: "CACHE MISS"
  };

  return (
    <div className="flex justify-center w-full relative">
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: state === "hit" || state === "active" ? 1.05 : 1 }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border backdrop-blur-sm transition-all duration-500 w-4/5 max-w-[200px] ${styles[state]}`}
      >
        <Icon size={14} />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-widest uppercase">{label}</span>
          <span className="text-[8px] font-mono tracking-widest opacity-80 mt-0.5">{statusText[state]}</span>
        </div>
      </motion.div>
    </div>
  );
}