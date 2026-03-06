"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Database, Cpu, Loader2, Timer, Fingerprint, Layers,
  ShieldCheck, Zap, BrainCircuit, GitMerge, Activity, Cloud, Server,
  Send, ChevronRight, ArrowDownRight, CircleDot
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

// ────────────────────
// MAIN DASHBOARD
// ────────────────────
export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Telemetry state
  const [source, setSource] = useState<string>("WAITING...");
  const [ttft, setTtft] = useState<number>(0);
  const [velocity, setVelocity] = useState<number>(0);
  const [similarity, setSimilarity] = useState<number>(0);
  const [vector, setVector] = useState<number[]>([]);
  const [activeModel, setActiveModel] = useState<string>("");
  const [failedModels, setFailedModels] = useState<string[]>([]);

  // Sparkline data
  const [sparkData, setSparkData] = useState<{ t: number; v: number }[]>([]);

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
    setActiveModel("");
    setFailedModels([]);
    setSparkData([]);

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

                  // Extract model name from source
                  if (parsed.source?.startsWith("llm_generated_")) {
                    setActiveModel(parsed.source.replace("llm_generated_", ""));
                  }
                } else if (parsed.event === "fallback_triggered") {
                  if (parsed.failed_model) {
                    setFailedModels((prev) => [...prev, parsed.failed_model]);
                  }
                } else if (parsed.text) {
                  setOutput((prev) => prev + parsed.text);
                  tokenCount++;
                  const elapsed = (Date.now() - reqStartTime) / 1000;
                  if (elapsed > 0) {
                    const vel = Math.round(tokenCount / elapsed);
                    setVelocity(vel);
                    setSparkData((prev) => [
                      ...prev,
                      { t: Math.round(elapsed * 100) / 100, v: vel },
                    ]);
                  }
                }
              } catch {
                // skip parse errors
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
  const displaySource =
    source === "redis_cache"
      ? "L1: Redis Exact"
      : source === "postgres_semantic_cache"
        ? "L2: pgvector Semantic"
        : source.startsWith("llm_generated_")
          ? "LLM: " + source.replace("llm_generated_", "")
          : source;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/30">
      {/* 3-COLUMN MAIN LAYOUT */}
      <main className="max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-57px)]">
        {/* LEFT: EXECUTION TREE (4 Col) */}
        <section className="col-span-1 lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 z-10">
              <GitMerge size={15} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Execution Pipeline
              </h2>
            </div>
            <div className="flex-1 w-full relative overflow-y-auto custom-scrollbar">
              <ExecutionTree
                source={source}
                activeModel={activeModel}
                failedModels={failedModels}
              />
            </div>
          </div>
        </section>

        {/* CENTER: PLAYGROUND (5 Col) */}
        <section className="col-span-1 lg:col-span-5 flex flex-col gap-4 h-full">
          {/* Prompt */}
          <form
            onSubmit={handleExecute}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 shadow-2xl flex flex-col transition-all focus-within:border-cyan-500/40 focus-within:shadow-cyan-500/5"
          >
            <div className="flex items-center px-5 py-4 gap-3">
              <ChevronRight size={16} className="text-cyan-500 shrink-0" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="Enter your query..."
                className="w-full bg-transparent text-sm focus:outline-none text-zinc-100 placeholder:text-zinc-600 font-medium disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="ml-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/10 shrink-0"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {isGenerating ? "..." : "EXEC"}
              </button>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950/50 border-t border-zinc-800/30 text-[10px] font-mono uppercase tracking-wider text-zinc-500 overflow-x-auto rounded-b-2xl">
              <StatusPill
                icon={Database}
                label={isCacheHit ? displaySource : "Cache"}
                active={isCacheHit}
                color="emerald"
              />
              <StatusPill
                icon={Cpu}
                label={source.includes("llm") ? displaySource : "LLM"}
                active={source.includes("llm")}
                color="cyan"
              />
              <StatusPill
                icon={Activity}
                label={`${velocity} t/s`}
                active={velocity > 0}
                color="amber"
              />
            </div>
          </form>

          {/* Output */}
          <div className="flex-1 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-6 overflow-y-auto relative font-sans text-sm text-zinc-300 leading-relaxed shadow-inner custom-scrollbar">
            {!output && !isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Terminal size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-600 font-mono text-xs">Awaiting input...</p>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {output}
                {isGenerating && (
                  <motion.span
                    className="inline-block w-2 h-4 ml-1 bg-cyan-500 align-middle rounded-sm"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>
            )}
            <div ref={outputEndRef} />
          </div>
        </section>

        {/* RIGHT: METRICS (3 Col) */}
        <section className="col-span-1 lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          {/* Latency & Velocity */}
          <div className="flex-[4] rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Timer size={15} className="text-emerald-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Performance
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard label="TTFT" value={ttft} unit="ms" color="cyan" />
              <MetricCard label="Throughput" value={velocity} unit="t/s" color="emerald" />
            </div>

            {/* Sparkline */}
            <div className="flex-1 rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-3 min-h-[80px]">
              <div className="text-[9px] text-zinc-500 font-mono uppercase mb-2">
                Token Velocity (real-time)
              </div>
              {sparkData.length > 1 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "10px",
                        color: "#a1a1aa",
                      }}
                      labelFormatter={(v: any) => `${v}s`}
                      formatter={(v: any) => [`${v} t/s`, "Velocity"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#sparkGrad)"
                      dot={false}
                      animationDuration={300}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[85%] text-zinc-700 text-[10px] font-mono">
                  Waiting for stream data...
                </div>
              )}
            </div>
          </div>

          {/* Semantic Engine */}
          <div className="flex-[6] rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-5">
              <Fingerprint size={15} className="text-cyan-400" />
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Vector Engine
              </h2>
            </div>

            <div className="flex flex-col gap-5 h-full">
              {/* Similarity Gauge */}
              <SimilarityGauge similarity={similarity} />

              {/* Embedding Preview */}
              <div className="flex-1 rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4 overflow-hidden relative flex flex-col">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-3 flex items-center justify-between">
                  <span>EMBEDDING DIM[384]</span>
                  <Layers size={12} />
                </div>

                {/* Mini heatmap visualization */}
                {vector.length > 0 ? (
                  <div className="flex-1 overflow-hidden">
                    <div className="flex flex-wrap gap-[2px] mb-3">
                      {vector.slice(0, 60).map((v, i) => (
                        <div
                          key={i}
                          className="w-[6px] h-[6px] rounded-[1px] transition-all"
                          style={{
                            backgroundColor: `hsl(${180 + v * 60}, 70%, ${40 + Math.abs(v) * 30}%)`,
                            opacity: 0.4 + Math.abs(v) * 0.6,
                          }}
                          title={`dim[${i}]: ${v.toFixed(4)}`}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono break-all leading-relaxed overflow-y-auto custom-scrollbar max-h-[80px]">
                      [{vector.map((v) => v.toFixed(3)).join(", ")}...]
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-700 text-[10px] font-mono">
                    Awaiting embedding generation
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ──────────────────────────────────
// STATUS PILL
// ──────────────────────────────────
function StatusPill({
  icon: Icon,
  label,
  active,
  color,
}: {
  icon: any;
  label: string;
  active: boolean;
  color: "cyan" | "emerald" | "amber";
}) {
  const colors = {
    cyan: active ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" : "",
    emerald: active ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" : "",
    amber: active ? "text-amber-400 border-amber-500/30 bg-amber-500/5" : "",
  };

  return (
    <span
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
        active ? colors[color] : "border-zinc-800/50 bg-zinc-900/30"
      }`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

// ──────────────────────────────────
// METRIC CARD
// ──────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: "cyan" | "emerald";
}) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3.5 flex flex-col justify-center">
      <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-2xl font-bold ${color === "cyan" ? "text-cyan-400" : "text-emerald-400"}`}
        >
          {value}
        </motion.span>
        <span className="text-[10px] text-zinc-500 font-mono uppercase">{unit}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────
// SIMILARITY GAUGE (Animated Ring)
// ──────────────────────────────────
function SimilarityGauge({ similarity }: { similarity: number }) {
  const pct = similarity * 100;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const gaugeColor =
    pct >= 90 ? "#10b981" : pct >= 70 ? "#06b6d4" : pct >= 50 ? "#eab308" : "#71717a";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: similarity > 0 ? offset : circumference }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <motion.span
            key={pct}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold"
            style={{ color: gaugeColor }}
          >
            {similarity > 0 ? `${pct.toFixed(0)}%` : "--"}
          </motion.span>
        </div>
      </div>
      <div>
        <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-1">
          Cosine Similarity
        </div>
        <div className="text-[10px] text-zinc-600 leading-tight">
          pgvector semantic match score
        </div>
        {similarity > 0.9 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-[9px] text-emerald-400 font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 inline-block"
          >
            Cache Hit &gt; 90%
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// EXECUTION TREE WITH LLM BRANCHES
// ──────────────────────────────────────────────
const LLM_MODELS = [
  { id: "cloud_llama_70b", label: "Llama 3.3 70B", sub: "Groq Cloud — Versatile", icon: Cloud },
  { id: "cloud_llama_8b", label: "Llama 3.1 8B", sub: "Groq Cloud — Instant", icon: Cloud },
  { id: "local_llama3", label: "Llama 3.2", sub: "Ollama — Local", icon: Server },
];

const TREE_STAGES = [
  { id: "gateway", label: "API Gateway", sub: "Zod Validate + Sliding Window Rate Limit", icon: ShieldCheck },
  { id: "l1", label: "L1 Redis Cache", sub: "SHA-256 Hash → Exact Match", icon: Zap },
  { id: "embedder", label: "Vector Embedder", sub: "BAAI/bge-small-en-v1.5 (384d)", icon: Layers },
  { id: "l2", label: "L2 Semantic Cache", sub: "pgvector IVFFlat Cosine Search", icon: Database },
  { id: "llm", label: "LLM Router", sub: "Priority Fallback Chain", icon: BrainCircuit },
];

type NodeState = "idle" | "evaluating" | "hit" | "miss" | "active";

function ExecutionTree({
  source,
  activeModel,
  failedModels,
}: {
  source: string;
  activeModel: string;
  failedModels: string[];
}) {
  const isStarted = source !== "WAITING...";
  const isRouting = source === "ROUTING...";

  const l1Hit = source === "redis_cache";
  const l1Miss = source === "postgres_semantic_cache" || source.includes("llm");

  const l2Hit = source === "postgres_semantic_cache";
  const l2Miss = source.includes("llm");

  const llmActive = source.includes("llm");

  const getState = (id: string): NodeState => {
    switch (id) {
      case "gateway":
        return isStarted ? "active" : "idle";
      case "l1":
        return l1Hit ? "hit" : l1Miss ? "miss" : isStarted ? "evaluating" : "idle";
      case "embedder":
        return l1Miss ? "active" : "idle";
      case "l2":
        return l2Hit ? "hit" : l2Miss ? "miss" : l1Miss ? "evaluating" : "idle";
      case "llm":
        return llmActive ? "active" : "idle";
      default:
        return "idle";
    }
  };

  const getModelState = (modelId: string): NodeState => {
    if (activeModel === modelId) return "hit";
    if (failedModels.includes(modelId)) return "miss";
    if (llmActive && !activeModel) return "evaluating";
    return "idle";
  };

  const pathLit = {
    gatewayToL1: isStarted,
    l1ToEmbedder: l1Miss,
    embedderToL2: l1Miss,
    l2ToLlm: l2Miss,
  };

  const connectorKeys = [
    "gatewayToL1",
    "l1ToEmbedder",
    "embedderToL2",
    "l2ToLlm",
  ] as const;

  return (
    <div className="flex flex-col gap-0 w-full py-2">
      {TREE_STAGES.map((stage, i) => {
        const state = getState(stage.id);
        const isTerminal = (stage.id === "l1" && l1Hit) || (stage.id === "l2" && l2Hit);
        const showConnector = i < TREE_STAGES.length - 1 && !isTerminal;
        const connectorLit = connectorKeys[i] ? pathLit[connectorKeys[i]] : false;

        return (
          <div key={stage.id}>
            <TreeNode
              label={stage.label}
              sub={stage.sub}
              icon={stage.icon}
              state={state}
              isTerminal={isTerminal}
              terminalLabel={
                l1Hit && stage.id === "l1"
                  ? "SERVED FROM REDIS"
                  : l2Hit && stage.id === "l2"
                    ? "SERVED FROM PGVECTOR"
                    : undefined
              }
            />

            {/* LLM Branch Tree */}
            {stage.id === "llm" && llmActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.4 }}
                className="ml-8 mt-1 mb-2 flex flex-col gap-1"
              >
                {LLM_MODELS.map((model) => {
                  const modelState = getModelState(model.id);
                  return (
                    <div key={model.id} className="flex items-center gap-2 ml-2">
                      <ArrowDownRight
                        size={12}
                        className={
                          modelState === "hit"
                            ? "text-emerald-500"
                            : modelState === "miss"
                              ? "text-red-400/60"
                              : "text-zinc-700"
                        }
                      />
                      <LLMBranchNode
                        label={model.label}
                        sub={model.sub}
                        icon={model.icon}
                        state={modelState}
                      />
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Connector */}
            {showConnector && (
              <div className="flex justify-center">
                <motion.div
                  className="w-[2px] h-5 rounded-full"
                  initial={{ scaleY: 0 }}
                  animate={{
                    scaleY: 1,
                    backgroundColor: connectorLit ? "#06b6d4" : "#27272a",
                  }}
                  transition={{ duration: 0.3, delay: i * 0.15 }}
                  style={{ originY: 0 }}
                />
              </div>
            )}

            {/* Terminal indicator */}
            {isTerminal && (
              <div className="flex justify-center mt-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono uppercase tracking-widest"
                >
                  <CircleDot size={10} />
                  Response Served
                </motion.div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tree Node ──
function TreeNode({
  label,
  sub,
  icon: Icon,
  state,
  isTerminal,
  terminalLabel,
}: {
  label: string;
  sub: string;
  icon: any;
  state: NodeState;
  isTerminal?: boolean;
  terminalLabel?: string;
}) {
  const styles: Record<NodeState, string> = {
    idle: "bg-zinc-900/30 border-zinc-800/60 text-zinc-600",
    evaluating: "bg-cyan-950/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]",
    active: "bg-cyan-950/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]",
    hit: "bg-emerald-950/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    miss: "bg-zinc-900/20 border-zinc-800/40 text-zinc-600 opacity-50",
  };

  const statusDot: Record<NodeState, string> = {
    idle: "bg-zinc-700",
    evaluating: "bg-cyan-400 animate-pulse",
    active: "bg-cyan-400",
    hit: "bg-emerald-400",
    miss: "bg-red-400/60",
  };

  const statusLabel: Record<NodeState, string> = {
    idle: "STANDBY",
    evaluating: "CHECKING...",
    active: "EXECUTED",
    hit: "HIT",
    miss: "MISS",
  };

  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-500 ${styles[state]}`}
    >
      <Icon size={16} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold tracking-wider uppercase truncate">{label}</div>
        <div className="text-[9px] font-mono opacity-60 truncate">{terminalLabel || sub}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${statusDot[state]}`} />
        <span className="text-[8px] font-mono tracking-widest uppercase opacity-80">
          {statusLabel[state]}
        </span>
      </div>
    </motion.div>
  );
}

// ── LLM Branch Node ──
function LLMBranchNode({
  label,
  sub,
  icon: Icon,
  state,
}: {
  label: string;
  sub: string;
  icon: any;
  state: NodeState;
}) {
  const styles: Record<NodeState, string> = {
    idle: "bg-zinc-900/20 border-zinc-800/40 text-zinc-600",
    evaluating: "bg-amber-950/20 border-amber-500/30 text-amber-400",
    active: "bg-cyan-950/20 border-cyan-500/30 text-cyan-400",
    hit: "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    miss: "bg-red-950/10 border-red-500/20 text-red-400/70",
  };

  const statusText: Record<NodeState, string> = {
    idle: "",
    evaluating: "TRYING...",
    active: "ACTIVE",
    hit: "SELECTED",
    miss: "FAILED",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[10px] flex-1 transition-all ${styles[state]}`}
    >
      <Icon size={12} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold tracking-wider uppercase truncate">{label}</div>
        <div className="text-[8px] font-mono opacity-50">{sub}</div>
      </div>
      {statusText[state] && (
        <span className="text-[7px] font-mono tracking-widest uppercase opacity-80 shrink-0">
          {statusText[state]}
        </span>
      )}
    </motion.div>
  );
}
