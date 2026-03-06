"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Clock, Database, Cpu, Zap, TrendingUp, ArrowUpRight,
  ArrowDownRight, Activity, RefreshCw, Search, ChevronDown,
  Server, Cloud, Layers, AlertCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

// ── types ──
interface TelemetryLog {
  _id: string;
  prompt: string;
  response: string;
  source: string;
  latency_ms: number;
  similarity_score?: number;
  timestamp: string;
}

interface TelemetryStats {
  totalRequests: number;
  avgLatency: number;
  cacheHitRate: number;
  sourceDistribution: { _id: string; count: number; avgLatency: number }[];
  latencyOverTime: { source: string; latency_ms: number; timestamp: string; similarity_score?: number }[];
  hourlyVolume: { _id: string; count: number; avgLatency: number }[];
}

const SOURCE_COLORS: Record<string, string> = {
  redis_cache: "#10b981",
  postgres_semantic_cache: "#06b6d4",
  llm_generated_cloud_llama_70b: "#8b5cf6",
  llm_generated_cloud_llama_8b: "#f59e0b",
  llm_generated_local_llama3: "#ec4899",
};

const SOURCE_LABELS: Record<string, string> = {
  redis_cache: "L1 Redis Cache",
  postgres_semantic_cache: "L2 Semantic Cache",
  llm_generated_cloud_llama_70b: "Llama 3.3 70B (Groq)",
  llm_generated_cloud_llama_8b: "Llama 3.1 8B (Groq)",
  llm_generated_local_llama3: "Llama 3.2 (Local)",
};

const SOURCE_ICONS: Record<string, any> = {
  redis_cache: Zap,
  postgres_semantic_cache: Database,
  llm_generated_cloud_llama_70b: Cloud,
  llm_generated_cloud_llama_8b: Cloud,
  llm_generated_local_llama3: Server,
};

export default function TelemetryPage() {
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch("http://localhost:3000/api/telemetry/stats"),
        fetch("http://localhost:3000/api/telemetry"),
      ]);
      if (!statsRes.ok || !logsRes.ok) throw new Error("Failed to fetch telemetry data");
      setStats(await statsRes.json());
      setLogs(await logsRes.json());
    } catch (err: any) {
      setError(err.message || "Failed to load telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filter !== "all") result = result.filter((l) => l.source === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => l.prompt.toLowerCase().includes(q));
    }
    return result;
  }, [logs, filter, searchQuery]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!stats) return [];
    return stats.sourceDistribution.map((s) => ({
      name: SOURCE_LABELS[s._id] || s._id,
      value: s.count,
      color: SOURCE_COLORS[s._id] || "#71717a",
    }));
  }, [stats]);

  // Latency trend data
  const latencyTrend = useMemo(() => {
    if (!stats) return [];
    return stats.latencyOverTime.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      latency: item.latency_ms,
      source: SOURCE_LABELS[item.source] || item.source,
      color: SOURCE_COLORS[item.source] || "#71717a",
    }));
  }, [stats]);

  // Hourly volume data
  const volumeData = useMemo(() => {
    if (!stats) return [];
    return stats.hourlyVolume.map((h) => ({
      hour: h._id.split(" ")[1] || h._id,
      requests: h.count,
      avgLatency: Math.round(h.avgLatency),
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={24} className="text-cyan-500" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-mono transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-cyan-500/30">
      <main className="max-w-[1800px] mx-auto p-4 pb-8 space-y-4">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-cyan-400" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Telemetry Dashboard</h1>
              <p className="text-[11px] text-zinc-500 font-mono">
                {stats?.totalRequests || 0} total requests logged
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={stats?.totalRequests || 0}
            icon={Activity}
            color="cyan"
            suffix=""
          />
          <StatCard
            label="Avg Latency"
            value={Math.round(stats?.avgLatency || 0)}
            icon={Clock}
            color="emerald"
            suffix="ms"
          />
          <StatCard
            label="Cache Hit Rate"
            value={Math.round(stats?.cacheHitRate || 0)}
            icon={Zap}
            color="amber"
            suffix="%"
          />
          <StatCard
            label="Sources Active"
            value={stats?.sourceDistribution?.length || 0}
            icon={Layers}
            color="violet"
            suffix=""
          />
        </div>

        {/* CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Latency Over Time */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-cyan-400" />
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Latency Over Time
              </h3>
              <span className="text-[9px] font-mono text-zinc-600 ml-auto">Last 50 requests</span>
            </div>
            <div className="h-[250px]">
              {latencyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyTrend}>
                    <defs>
                      <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#52525b", fontSize: 9 }}
                      axisLine={{ stroke: "#27272a" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#52525b", fontSize: 9 }}
                      axisLine={{ stroke: "#27272a" }}
                      tickLine={false}
                      unit="ms"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#a1a1aa",
                      }}
                      formatter={(v: any) => [`${v}ms`, "Latency"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#latGrad)"
                      dot={(props: any) => {
                        const color = latencyTrend[props.index]?.color || "#06b6d4";
                        return (
                          <circle
                            key={props.index}
                            cx={props.cx}
                            cy={props.cy}
                            r={3}
                            fill={color}
                            stroke="none"
                          />
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* Source Distribution Pie */}
          <div className="rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={15} className="text-emerald-400" />
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Source Distribution
              </h3>
            </div>
            <div className="h-[250px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "12px",
                        fontSize: "11px",
                        color: "#a1a1aa",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value: string) => (
                        <span className="text-[10px] text-zinc-400">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>

        {/* HOURLY VOLUME */}
        <div className="rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-amber-400" />
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
              Hourly Request Volume
            </h3>
            <span className="text-[9px] font-mono text-zinc-600 ml-auto">Last 24 hours</span>
          </div>
          <div className="h-[200px]">
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#52525b", fontSize: 9 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#52525b", fontSize: 9 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#a1a1aa",
                    }}
                    formatter={(v: any, name: any) => [
                      name === "requests" ? `${v} reqs` : `${v}ms`,
                      name === "requests" ? "Requests" : "Avg Latency",
                    ]}
                  />
                  <Bar dataKey="requests" radius={[6, 6, 0, 0]}>
                    {volumeData.map((_, i) => (
                      <Cell key={i} fill={i === volumeData.length - 1 ? "#06b6d4" : "#27272a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        {/* SOURCE BREAKDOWN CARDS */}
        {stats && stats.sourceDistribution.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-zinc-400 mb-3 flex items-center gap-2">
              <Layers size={13} />
              Source Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {stats.sourceDistribution.map((src) => {
                const Icon = SOURCE_ICONS[src._id] || Database;
                const color = SOURCE_COLORS[src._id] || "#71717a";
                const pct = stats.totalRequests > 0 ? ((src.count / stats.totalRequests) * 100).toFixed(1) : 0;
                return (
                  <motion.div
                    key={src._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 hover:border-zinc-700/60 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-300 truncate">
                        {SOURCE_LABELS[src._id] || src._id}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold" style={{ color }}>{src.count}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{pct}%</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 rounded-full h-1.5 mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">
                      Avg: {Math.round(src.avgLatency)}ms
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* REQUEST LOG TABLE */}
        <div className="rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-zinc-400" />
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-zinc-200">
                Request Log
              </h3>
              <span className="text-[9px] font-mono text-zinc-600">
                ({filteredLogs.length} entries)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts..."
                  className="pl-8 pr-3 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-[11px] text-zinc-300 focus:outline-none focus:border-cyan-500/40 w-48 placeholder:text-zinc-700"
                />
              </div>
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-[11px] text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="redis_cache">Redis Cache</option>
                <option value="postgres_semantic_cache">Semantic Cache</option>
                <option value="llm_generated_cloud_llama_70b">Llama 70B</option>
                <option value="llm_generated_cloud_llama_8b">Llama 8B</option>
                <option value="llm_generated_local_llama3">Local Llama</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50">
                  <th className="pb-3 pr-4 font-medium">Timestamp</th>
                  <th className="pb-3 pr-4 font-medium">Prompt</th>
                  <th className="pb-3 pr-4 font-medium">Source</th>
                  <th className="pb-3 pr-4 font-medium text-right">Latency</th>
                  <th className="pb-3 font-medium text-right">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 50).map((log) => {
                  const color = SOURCE_COLORS[log.source] || "#71717a";
                  const isExpanded = expandedRow === log._id;
                  return (
                    <AnimatePresence key={log._id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-zinc-800/30 hover:bg-zinc-800/10 cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : log._id)}
                      >
                        <td className="py-3 pr-4 text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 text-[11px] text-zinc-300 max-w-[300px] truncate">
                          {log.prompt}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider"
                            style={{
                              backgroundColor: `${color}15`,
                              color,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            {SOURCE_LABELS[log.source] || log.source}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-[11px] font-mono text-zinc-400">
                          {log.latency_ms}
                          <span className="text-zinc-600 text-[9px] ml-0.5">ms</span>
                        </td>
                        <td className="py-3 text-right text-[11px] font-mono text-zinc-400">
                          {log.similarity_score
                            ? `${(log.similarity_score * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </motion.tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <td colSpan={5} className="px-4 py-4 bg-zinc-900/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-2">
                                  Full Prompt
                                </div>
                                <div className="text-[11px] text-zinc-300 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/30 max-h-[120px] overflow-y-auto custom-scrollbar">
                                  {log.prompt}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-2">
                                  Response Preview
                                </div>
                                <div className="text-[11px] text-zinc-400 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/30 max-h-[120px] overflow-y-auto custom-scrollbar">
                                  {log.response.slice(0, 500)}
                                  {log.response.length > 500 ? "..." : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  );
                })}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <p className="text-zinc-600 text-xs font-mono">No matching telemetry entries</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  label: string;
  value: number;
  icon: any;
  color: "cyan" | "emerald" | "amber" | "violet";
  suffix: string;
}) {
  const colorMap = {
    cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    violet: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-5 flex items-start gap-4"
    >
      <div className={`p-2.5 rounded-xl ${c.bg} ${c.border} border`}>
        <Icon size={18} className={c.text} />
      </div>
      <div>
        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">
          {label}
        </div>
        <div className="flex items-baseline gap-1.5">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl font-bold ${c.text}`}
          >
            {value.toLocaleString()}
          </motion.span>
          {suffix && (
            <span className="text-[10px] text-zinc-500 font-mono uppercase">{suffix}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty State ──
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-zinc-700 text-[10px] font-mono">
      No data available yet
    </div>
  );
}
