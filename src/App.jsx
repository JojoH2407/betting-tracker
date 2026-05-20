import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://kxcrcxlomvrpvxcnncph.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3JjeGxvbXZycHZ4Y25uY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTYwMTgsImV4cCI6MjA5NDE5MjAxOH0.-vlciOBd-go4MBck7lX4DNp5-aS5v0J1QGu4H-end4g"
);

// ── RESPONSIVE ───────────────────────────────────────────────────────────────
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

// ── SPORTS CONFIG ─────────────────────────────────────────────────────────────
const SPORTS_CONFIG = {
  Tennis: {
    leagues: ["ATP", "WTA", "Outright"],
    subCats: ["ML", "AH", "O/U", "Parlay"],
  },
  Baseball: {
    leagues: ["MLB", "KBO", "Outright"],
    subCats: ["ML", "AH", "O/U", "HR", "Total Bases", "Parlay"],
  },
  Football: {
    leagues: ["Ligue 1", "BPL", "Liga", "Serie A", "Bundesliga", "LDC", "CDM", "National Cup", "Outright", "Exotique"],
    subCats: ["ML", "AH", "O/U", "BTTS", "Parlay"],
  },
  Basketball: {
    leagues: ["NBA", "EuroLeague", "Outright", "Autre"],
    subCats: ["ML", "AH", "O/U", "Outright", "Parlay"],
  },
  eSport: { leagues: ["Outright"], subCats: ["ML"] },
  "F1": { leagues: ["Outright"], subCats: [] },
  Cycling: { leagues: ["Outright"], subCats: [] },
};

const SPORTS = Object.keys(SPORTS_CONFIG);
const RESULTS = ["Pending", "Win", "Lose", "Void"];

const RESULT_COLORS = {
  Win: "#22c55e",
  Lose: "#ef4444",
  Void: "#94a3b8",
  Pending: "#f59e0b",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) =>
  n == null || isNaN(n) ? "–" : (n >= 0 ? "+" : "") + Number(n).toFixed(d);
const fmtAbs = (n, d = 2) =>
  n == null || isNaN(n) ? "–" : Number(n).toFixed(d);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthKey = (d) => d?.slice(0, 7) ?? "";
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthLabel = (k) => {
  if (!k || !k.includes("-")) return k ?? "";
  const [y, m] = k.split("-");
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return k;
  return `${MONTH_NAMES[idx]} ${y}`;
};

// ── STORAGE ───────────────────────────────────────────────────────────────────
// Supabase replaces localStorage — kept as no-op for bankroll (still local for now)
const load = (key, def) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  Plus: () => <Ico d="M12 5v14M5 12h14" />,
  List: () => <Ico d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  Chart: () => <Ico d="M3 3v18h18M7 16l4-4 4 4 4-8" />,
  Trash: ({ s }) => <Ico d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={s || 20} />,
  Edit: ({ s }) => <Ico d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={s || 20} />,
  Download: () => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  Upload: () => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
};

// ── PROFIT CALC ───────────────────────────────────────────────────────────────
const calcProfit = (bet, field = "E") => {
  const stake = field === "E"
    ? Number(bet.stakeE ?? bet.stakee ?? 0)
    : Number(bet.stakeU ?? bet.stakeu ?? 0);
  if (bet.result === "Win") return (Number(bet.odd) - 1) * stake;
  if (bet.result === "Lose") return -stake;
  return 0;
};

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
const LineChart = ({ data, valueKey = "bk", colorKey = "profit", emptyMsg, color = "#38bdf8", showDots = true, H = 90 }) => {
  if (!data || data.length < 2) return (
    <div style={{ textAlign: "center", color: "#475569", padding: "20px 0", fontSize: 13 }}>
      {emptyMsg ?? "Not enough data"}
    </div>
  );
  const vals = data.map((d) => d[valueKey]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 340, pad = 12;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (H - pad * 2) - ((d[valueKey] - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const polyline = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  // area fill path
  const areaPath = `M${pts[0][0]},${H - pad} ` + pts.map(([x,y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length-1][0]},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-grad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {showDots && pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3}
          fill={colorKey && data[i][colorKey] !== undefined ? (data[i][colorKey] >= 0 ? "#22c55e" : "#ef4444") : color} />
      ))}
      <circle cx={lx} cy={ly} r={5} fill={color} opacity={0.9} />
    </svg>
  );
};

// Keep Sparkline as alias
const Sparkline = ({ data }) => <LineChart data={data} valueKey="bk" colorKey="profit" emptyMsg="Fill in monthly bankroll end values to see the chart" />;

// ── STAT ROW ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, color, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#475569" }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? "#f8fafc" }}>{value}</div>
    </div>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────────
function KPI({ label, value, color, large }) {
  return (
    <div style={{ background: "#111827", borderRadius: 12, padding: large ? "14px 16px" : "12px 14px", border: "1px solid #1e293b", textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 20 : 17, fontWeight: 800, color: color ?? "#f8fafc" }}>{value}</div>
    </div>
  );
}

// ── TAG ───────────────────────────────────────────────────────────────────────
const Tag = ({ children, color }) => (
  <span style={{
    fontSize: 11, borderRadius: 6, padding: "2px 8px",
    background: color ? color + "22" : "#1e293b",
    color: color ?? "#94a3b8",
    border: color ? `1px solid ${color}44` : "none",
  }}>{children}</span>
);

// ── CHIP ──────────────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    background: active ? (color ?? "#38bdf8") + "22" : "#1e293b",
    border: `1px solid ${active ? (color ?? "#38bdf8") : "#334155"}`,
    color: active ? (color ?? "#38bdf8") : "#94a3b8",
    borderRadius: 20, padding: "6px 13px", fontSize: 13, cursor: "pointer",
    whiteSpace: "nowrap", transition: "all .15s", fontWeight: active ? 600 : 400,
  }}>{label}</button>
);

const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? "#38bdf8" : "#1e293b", border: "none",
    color: active ? "#0a0f1e" : "#94a3b8",
    borderRadius: 20, padding: "4px 13px", fontSize: 12, cursor: "pointer",
    whiteSpace: "nowrap", fontWeight: active ? 700 : 400,
  }}>{label}</button>
);

const Input = ({ label, ...props }) => (
  <div>
    {label && <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>}
    <input style={{
      width: "100%", background: "#1e293b", border: "1px solid #334155",
      borderRadius: 10, padding: "12px 14px", color: "#f8fafc", fontSize: 15,
      outline: "none", boxSizing: "border-box", WebkitAppearance: "none",
    }} {...props} />
  </div>
);

const Btn = ({ children, onClick, bg, color, flex }) => (
  <button onClick={onClick} style={{
    background: bg ?? "#334155", border: "none", borderRadius: 12,
    padding: "14px 16px", color: color ?? "#f8fafc",
    fontSize: 15, cursor: "pointer", fontWeight: 700,
    flex: flex ?? "unset", width: flex ? "100%" : "auto",
  }}>{children}</button>
);

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
const parseCSVLine = (line) => {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
};

const parseDate = (raw) => {
  if (!raw) return today();
  // dd/mm/yyyy → yyyy-mm-dd
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  // already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return today();
};

const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, "").toLowerCase().trim());

  const resultMap = { win: "Win", lose: "Lose", void: "Void", "": "", pending: "Pending" };
  const sportMap = { tennis: "Tennis", baseball: "Baseball", mlb: "Baseball", football: "Football", basketball: "Basketball", nba: "Basketball", esport: "eSport", "e-sport": "eSport", f1: "F1", cycling: "Cycling" };

  return lines.slice(1).map((line) => {
    if (!line.trim()) return null;
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });

    const rawSport = (row.sport ?? "").toLowerCase();
    const sport = sportMap[rawSport] ?? row.sport ?? "Tennis";
    const rawResult = (row.result ?? "").toLowerCase();
    const result = resultMap[rawResult] ?? (row.result || "");

    // Parse odd — replace comma decimal separator
    const parseNum = (v) => v ? parseFloat(v.replace(",", ".")) : 0;

    return {
      id: Date.now() + Math.random(),
      date: parseDate(row.date),
      sport,
      league: row.league ?? row.category ?? "",
      subCat: row.subcat ?? row.subcategory ?? row.type ?? "",
      bet: row.bet ?? "",
      odd: parseNum(row.odd ?? row.odds) || 1,
      stakeE: parseNum(row["stake(€)"] ?? row.stakee ?? row["stake(e)"] ?? row.stake) || 0,
      stakeU: parseNum(row["stake(u)"] ?? row.stakeu) || 0,
      result: result || "",
      note: row.note ?? "",
    };
  }).filter((b) => b && b.bet);
};

// ── EXPORT XLSX (via SheetJS CDN) ─────────────────────────────────────────────
const exportXLSX = (bets) => {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  script.onload = () => {
    const XLSX = window.XLSX;
    const pn = (v) => Number(String(v ?? 0).replace(",", ".")) || 0;
    const rows = bets.map((b) => {
      const odd = pn(b.odd);
      const stakeE = pn(b.stakeE ?? b.stakee);
      const stakeU = pn(b.stakeU ?? b.stakeu);
      const profitE = b.result === "Win" ? (odd - 1) * stakeE : b.result === "Lose" ? -stakeE : 0;
      const profitU = b.result === "Win" ? (odd - 1) * stakeU : b.result === "Lose" ? -stakeU : 0;
      return {
        Date: b.date,
        Sport: b.sport,
        League: b.league ?? "",
        "Sub-cat": b.subCat ?? b.subcat ?? "",
        Bet: b.bet,
        Odd: odd,
        "Stake (€)": stakeE,
        "Stake (u)": stakeU,
        Result: b.result,
        "Profit (€)": stakeE > 0 ? profitE : "",
        "Profit (u)": stakeU > 0 ? profitU : "",
        Note: b.note ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bets");
    XLSX.writeFile(wb, "bet-tracker-export.xlsx");
  };
  document.head.appendChild(script);
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("add");
  const [scrollToDate, setScrollToDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statsTab, setStatsTab] = useState("bk");
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankroll, setBankrollState] = useState(() => load("bankroll_v2", {}));
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [batchForms, setBatchForms] = useState([emptyBetForm()]);

  const updateBets = (next) => { setBets(next); };
  const updateBankroll = (next) => { setBankrollState(next); save("bankroll_v2", next); };

  // ── Supabase: load bets on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("bets").select("*").order("date", { ascending: false });
      if (data) setBets(data.map(b => ({
        ...b,
        subCat: b.subcat ?? "",
        stakeE: Number(b.stakee ?? 0),
        stakeU: Number(b.stakeu ?? 0),
      })));
      if (error) console.error("Load error:", error);
      setLoading(false);
    };
    fetchBets();
  }, []);

  // unit value from the date of the first form
  const currentMonthBK = bankroll[monthKey(batchForms[0]?.date ?? today())];
  const unitValue = currentMonthBK?.unitValue ?? null;

  const handleSaveAll = async () => {
    if (saving) return;
    const valid = batchForms.filter(f => f.bet && f.odd);
    if (!valid.length) return;
    setSaving(true);
    if (editId !== null) {
      const f = valid[0];
      const stakeU = unitValue ? (Number(f.stakeE) / unitValue).toFixed(2) : f.stakeU;
      const entry = { date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "", bet: f.bet, odd: Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0), stakeu: Number(stakeU), result: f.result || "Pending", note: f.note ?? "" };
      const { error } = await supabase.from("bets").update(entry).eq("id", editId);
      if (!error) setBets(bets.map((b) => (b.id === editId ? { ...entry, id: editId } : b)));
      else alert("Error saving: " + error.message);
      setEditId(null);
    } else {
      const newEntries = valid.map((f, i) => {
        const stakeU = unitValue ? (Number(f.stakeE ?? f.stakee) / unitValue).toFixed(2) : (f.stakeU ?? f.stakeu ?? 1);
        return { date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "", bet: f.bet, odd: Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0), stakeu: Number(stakeU), result: f.result || "Pending", note: f.note ?? "" };
      });
      const { data, error } = await supabase.from("bets").insert(newEntries).select();
      if (data) setBets([...data.map(b => ({ ...b, subCat: b.subcat ?? "", stakeE: Number(b.stakee ?? 0), stakeU: Number(b.stakeu ?? 0) })), ...bets]);
      else alert("Error saving: " + error.message);
    }
    setBatchForms([emptyBetForm()]);
    const targetDate = valid[0]?.date ?? today();
    setScrollToDate(targetDate);
    setTab("list");
    setSaving(false);
  };

  const handleUpdateResult = async (bet, result) => {
    const { error } = await supabase.from("bets").update({ result }).eq("id", bet.id);
    if (!error) setBets(bets.map(b => b.id === bet.id ? { ...b, result } : b));
    else alert("Error: " + error.message);
  };

  const startEdit = (bet) => {
    setBatchForms([{
      ...bet,
      subCat: bet.subCat ?? bet.subcat ?? "",
      stakeE: Number(bet.stakeE ?? bet.stakee ?? 0),
      stakeU: Number(bet.stakeU ?? bet.stakeu ?? 0),
      odd: Number(bet.odd ?? 0),
    }]);
    setEditId(bet.id);
    setTab("add");
  };
  
  const deleteBet = async (id) => {
    const { error } = await supabase.from("bets").delete().eq("id", id);
    if (!error) setBets(bets.filter((b) => b.id !== id));
    else alert("Error deleting: " + error.message);
    setDeleteConfirm(null);
  };

  // months
  const allMonths = useMemo(() => [...new Set(bets.map((b) => monthKey(b.date)))].sort(), [bets]);

  const filtered = useMemo(() =>
    filterMonth === "all" ? bets : bets.filter((b) => monthKey(b.date) === filterMonth),
    [bets, filterMonth]);

  // group stats helper
  const groupStats = (bets, key) => {
    const map = {};
    bets.forEach((b) => {
      const k = key === "league" ? (b.league || b.sport || "–") : (b[key] || "–");
      if (!map[k]) map[k] = { bets: [], wins: 0, profitE: 0, profitU: 0, totalInvE: 0, totalInvU: 0, oddsSum: 0, oddsCount: 0 };
      const s = map[k];
      s.bets.push(b);
      if (b.result === "Win") { s.wins++; s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose") { s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      if (b.result !== "Void" && b.result !== "Pending") {
        s.totalInvE += Number(b.stakeE ?? b.stakee ?? 0);
        s.totalInvU += Number(b.stakeU ?? b.stakeu ?? 0);
      }
      if (b.odd) { s.oddsSum += Number(b.odd); s.oddsCount++; }
    });
    return map;
  };

  const bySport = useMemo(() => groupStats(filtered, "sport"), [filtered]);
  const byLeague = useMemo(() => groupStats(filtered, "league"), [filtered]);

  const total = useMemo(() => {
    let wins = 0, settled = 0, profitE = 0, profitU = 0, totalInvE = 0, totalInvU = 0, oddsSum = 0, oddsCount = 0;
    filtered.forEach((b) => {
      if (b.result !== "Void" && b.result !== "Pending") settled++;
      if (b.result === "Win") { wins++; profitE += calcProfit(b, "E"); profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose") { profitE += calcProfit(b, "E"); profitU += calcProfit(b, "U"); }
      if (b.result !== "Void" && b.result !== "Pending") {
        totalInvE += Number(b.stakeE ?? b.stakee ?? 0);
        totalInvU += Number(b.stakeU ?? b.stakeu ?? 0);
      }
      if (b.odd) { oddsSum += Number(b.odd); oddsCount++; }
    });
    return {
      total: filtered.length, wins, settled,
      winRate: settled ? (wins / settled) * 100 : 0,
      profitE, profitU, totalInvE, totalInvU,
      roi: totalInvE ? (profitE / totalInvE) * 100 : 0,
      avgOdd: oddsCount ? oddsSum / oddsCount : 0,
      avgStakeU: settled ? totalInvU / settled : 0,
    };
  }, [filtered]);

  const bkChartData = useMemo(() =>
    allMonths.map((mk) => {
      const bkEntry = bankroll[mk] ?? {};
      const bkVal = bkEntry.end ?? 0;
      const profit = bets.filter((b) => monthKey(b.date) === mk).reduce((acc, b) => acc + calcProfit(b, "E"), 0);
      return { label: monthLabel(mk), bk: bkVal, profit, mk };
    }).filter((d) => d.bk > 0),
    [allMonths, bets, bankroll]);

  const maxProfitAbs = Math.max(...Object.values(bySport).map((s) => Math.abs(s.profitE)), 1);

  // Daily profit chart (cumulative within filtered period)
  const dailyChartData = useMemo(() => {
    const byDay = {};
    filtered.forEach(b => {
      if (!byDay[b.date]) byDay[b.date] = 0;
      byDay[b.date] += calcProfit(b, "E");
    });
    const days = Object.keys(byDay).sort();
    let cumul = 0;
    return days.map(date => {
      cumul += byDay[date];
      return { label: date.slice(5), value: cumul, profit: byDay[date] };
    });
  }, [filtered]);

  // Odds range performance
  const oddsRanges = useMemo(() => {
    const ranges = [
      { label: "1.0-1.5", min: 1.0, max: 1.5 },
      { label: "1.5-2.0", min: 1.5, max: 2.0 },
      { label: "2.0-3.0", min: 2.0, max: 3.0 },
      { label: "3.0-5.0", min: 3.0, max: 5.0 },
      { label: "5.0+",    min: 5.0, max: Infinity },
    ];
    return ranges.map(r => {
      const rb = filtered.filter(b => Number(b.odd) >= r.min && Number(b.odd) < r.max);
      const settled = rb.filter(b => b.result !== "Void" && b.result !== "Pending");
      const wins = rb.filter(b => b.result === "Win").length;
      const profitE = rb.reduce((a, b) => a + calcProfit(b, "E"), 0);
      const invested = settled.reduce((a, b) => a + Number(b.stakeE ?? b.stakee ?? 0), 0);
      return {
        label: r.label,
        bets: rb.length,
        wins,
        wr: settled.length ? (wins / settled.length) * 100 : 0,
        profitE,
        roi: invested ? (profitE / invested) * 100 : 0,
      };
    }).filter(r => r.bets > 0);
  }, [filtered]);

  // CSV import → Supabase
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imported = parseCSV(ev.target.result);
      if (!imported.length) { alert("No valid bets found in CSV"); return; }
      // Strip client-side ids before insert
      const toInsert = imported.map(({ id, ...rest }) => ({
        date: rest.date, sport: rest.sport, league: rest.league ?? "",
        subcat: rest.subCat ?? rest.subcat ?? "", bet: rest.bet, odd: Number(rest.odd),
        stakee: Number(rest.stakeE ?? rest.stakee), stakeu: Number(rest.stakeU ?? rest.stakeu),
        result: rest.result || "", note: rest.note ?? "",
      }));
      const { data, error } = await supabase.from("bets").insert(toInsert).select();
      if (data) { setBets([...data.map(b => ({ ...b, subCat: b.subcat ?? "", stakeE: Number(b.stakee ?? 0), stakeU: Number(b.stakeu ?? 0) })), ...bets]); alert(`✅ ${data.length} bets imported!`); }
      else alert("Import error: " + error.message);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= 900;

  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0f1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontFamily: "sans-serif", gap: 16 }}>
      <div style={{ fontSize: 32 }}>🎯</div>
      <div style={{ fontSize: 14, color: "#64748b" }}>Loading your bets...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif", paddingBottom: isDesktop ? 0 : 90 }}>

      {/* HEADER */}
      <div style={{ background: "#0f172a", padding: isDesktop ? "18px 32px 14px" : "18px 18px 14px", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: isDesktop ? 1400 : "100%", margin: "0 auto" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#38bdf8", textTransform: "uppercase", marginBottom: 2 }}>JojoH Betting Tracker</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 10 }}>
            {filterMonth === "all" ? "All Time" : monthLabel(filterMonth)}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            <Pill label="All" active={filterMonth === "all"} onClick={() => setFilterMonth("all")} />
            {allMonths.map((mk) => <Pill key={mk} label={monthLabel(mk)} active={filterMonth === mk} onClick={() => setFilterMonth(mk)} />)}
          </div>
        </div>
      </div>

      {isDesktop ? (
        /* ── DESKTOP LAYOUT ── */
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>
          {/* Left column: Add form — fixed height, invisible scroll */}
          <div style={{ position: "sticky", top: 90, height: "calc(100vh - 110px)", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <style>{".hide-scroll::-webkit-scrollbar { display: none; }"}</style>
              <div className="hide-scroll" style={{ paddingBottom: 8 }}>
                <AddTab batchForms={batchForms} setBatchForms={setBatchForms}
                  handleSaveAll={handleSaveAll} editId={editId} setEditId={setEditId}
                  setTab={setTab} emptyForm={emptyBetForm()} unitValue={unitValue}
                  isDesktop={true} />
              </div>
            </div>
          </div>
          {/* Right column: tabs */}
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>
              {[["list","📋 Bets"], ["stats","📊 Stats"]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: tab === k ? "#38bdf8" : "#475569", borderBottom: tab === k ? "2px solid #38bdf8" : "2px solid transparent", paddingBottom: 8 }}>{l}</button>
              ))}
            </div>
            {tab !== "add" && (
              <div>
                {tab === "list" && <ListTab bets={filtered} onEdit={startEdit} onDelete={setDeleteConfirm} onUpdateResult={handleUpdateResult} onExport={() => exportXLSX(bets)} onImport={handleCSVImport} filterMonth={filterMonth} scrollToDate={scrollToDate} onScrollDone={() => setScrollToDate(null)} onDeleteAll={() => { if (filterMonth === "all") { supabase.from("bets").delete().neq("id","00000000-0000-0000-0000-000000000000").then(() => setBets([])); } else { const ids = bets.filter(b => monthKey(b.date) === filterMonth).map(b => b.id); supabase.from("bets").delete().in("id", ids).then(() => setBets(bets.filter(b => monthKey(b.date) !== filterMonth))); }}} />}
                {tab === "stats" && <StatsTab total={total} bySport={bySport} byLeague={byLeague} maxProfitAbs={maxProfitAbs} bkChartData={bkChartData} bankroll={bankroll} updateBankroll={updateBankroll} allMonths={allMonths} statsTab={statsTab} setStatsTab={setStatsTab} bets={bets} dailyChartData={dailyChartData} oddsRanges={oddsRanges} filterMonth={filterMonth} />}
              </div>
            )}
            {tab === "add" && <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>Filling form on the left →</div>}
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 16px 0" }}>
          {tab === "add" && (
            <AddTab batchForms={batchForms} setBatchForms={setBatchForms}
              handleSaveAll={handleSaveAll} editId={editId} setEditId={setEditId}
              setTab={setTab} emptyForm={emptyBetForm()} unitValue={unitValue} />
          )}
          {tab === "list" && (
            <ListTab bets={filtered} onEdit={startEdit} onDelete={setDeleteConfirm}
              onUpdateResult={handleUpdateResult}
              onExport={() => exportXLSX(bets)} onImport={handleCSVImport}
              filterMonth={filterMonth}
              scrollToDate={scrollToDate} onScrollDone={() => setScrollToDate(null)}
              onDeleteAll={async () => {
                if (filterMonth === "all") {
                  const { error } = await supabase.from("bets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                  if (!error) setBets([]);
                } else {
                  const ids = bets.filter((b) => monthKey(b.date) === filterMonth).map(b => b.id);
                  const { error } = await supabase.from("bets").delete().in("id", ids);
                  if (!error) setBets(bets.filter((b) => monthKey(b.date) !== filterMonth));
                }
              }} />
          )}
          {tab === "stats" && (
            <StatsTab total={total} bySport={bySport} byLeague={byLeague}
              maxProfitAbs={maxProfitAbs} bkChartData={bkChartData}
              bankroll={bankroll} updateBankroll={updateBankroll}
              allMonths={allMonths} statsTab={statsTab} setStatsTab={setStatsTab}
              bets={bets} dailyChartData={dailyChartData} oddsRanges={oddsRanges}
              filterMonth={filterMonth} />
          )}
        </div>
      )}

      {!isDesktop && (
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 500, background: "#0f172a", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-around", padding: "10px 0 24px", zIndex: 20 }}>
          {[
            { key: "add", label: editId ? "Edit" : "Add", icon: <Icons.Plus /> },
            { key: "list", label: "Bets", icon: <Icons.List /> },
            { key: "stats", label: "Stats", icon: <Icons.Chart /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === key ? "#38bdf8" : "#475569", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
              {icon}{label}
            </button>
          ))}
        </nav>
      )}

      {/* DELETE MODAL */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, margin: 20, border: "1px solid #334155", maxWidth: 320, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete this bet?</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setDeleteConfirm(null)} flex={1}>Cancel</Btn>
              <Btn onClick={() => deleteBet(deleteConfirm)} bg="#ef4444" flex={1}>Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ADD TAB
// ════════════════════════════════════════════════════════════════════════════════

const emptyBetForm = (base = {}) => ({
  date: base.date ?? today(),
  sport: base.sport ?? "Tennis",
  league: base.league ?? "ATP",
  subCat: base.subCat ?? "ML",
  bet: "",
  odd: "",
  stakeE: base.stakeE ?? 60,
  stakeU: base.stakeU ?? "",
  result: "Pending",
  note: "",
});

function BetForm({ index, form, onChange, onRemove, unitValue, canRemove }) {
  const cfg = SPORTS_CONFIG[form.sport] ?? { leagues: [], subCats: [] };
  const hasLeague = cfg.leagues.length > 0;
  const hasSubCat = cfg.subCats.length > 0;
  const rawStakeE = Number(form.stakeE ?? form.stakee ?? 0);
  const rawU = unitValue && rawStakeE > 0 ? (rawStakeE / unitValue) : null;
  const computedU = rawU !== null && !isNaN(rawU) ? rawU.toFixed(2) : null;
  const manualU = form.stakeU ?? form.stakeu ?? "";

  const set = (k, v) => {
    const next = { ...form, [k]: v };
    if (k === "sport") {
      next.league = SPORTS_CONFIG[v]?.leagues[0] ?? "";
      next.subCat = SPORTS_CONFIG[v]?.subCats[0] ?? "";
    }
    onChange(next);
  };

  return (
    <div style={{ background: "#111827", borderRadius: 14, padding: "14px", border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1 }}>Bet {index + 1}</div>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
        )}
      </div>

      {/* Date */}
      <Input label="Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />

      {/* Sport */}
      <div>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Sport</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(SPORTS_CONFIG).map((s) => <Chip key={s} label={s} active={form.sport === s} onClick={() => set("sport", s)} />)}
        </div>
      </div>

      {/* League */}
      {hasLeague && (
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>League</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cfg.leagues.map((l) => <Chip key={l} label={l} active={form.league === l} onClick={() => set("league", l)} />)}
          </div>
        </div>
      )}

      {/* SubCat */}
      {hasSubCat && (
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Type</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cfg.subCats.map((s) => <Chip key={s} label={s} active={form.subCat === s} onClick={() => set("subCat", s)} />)}
          </div>
        </div>
      )}

      {/* Bet description */}
      <Input placeholder="e.g. Djokovic vs Alcaraz ML" value={form.bet} onChange={(e) => set("bet", e.target.value)} />

      {/* Odd + Stakes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Input label="Odd" type="number" step="0.001" placeholder="2.100" value={form.odd} onChange={(e) => set("odd", e.target.value)} />
        <Input label="Stake €" type="number" value={form.stakeE} onChange={(e) => set("stakeE", e.target.value)} />
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Stake u</div>
          {computedU
            ? <div style={{ background: "#1e293b", border: "1px solid #38bdf833", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#38bdf8", fontWeight: 700 }}>{computedU}u</div>
            : <input type="number" step="0.25" value={manualU} onChange={(e) => set("stakeU", e.target.value)}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 14px", color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }} />
          }
        </div>
      </div>

      {/* Result */}
      <div>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Result</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RESULTS.map((r) => <Chip key={r} label={r} active={form.result === r} onClick={() => set("result", r)} color={RESULT_COLORS[r]} />)}
        </div>
      </div>

      {/* Note */}
      <Input label="Note (optional)" placeholder="Analysis, context..." value={form.note} onChange={(e) => set("note", e.target.value)} />
    </div>
  );
}

function AddTab({ batchForms, setBatchForms, handleSaveAll, editId, setEditId, setTab, emptyForm, unitValue, isDesktop }) {
  const addForm = () => {
    const last = batchForms[batchForms.length - 1];
    setBatchForms([...batchForms, emptyBetForm({ date: last.date, sport: last.sport, league: last.league, subCat: last.subCat, stakeE: last.stakeE, stakeU: last.stakeU })]);
  };
  const updateForm = (i, val) => setBatchForms(batchForms.map((f, idx) => idx === i ? val : f));
  const removeForm = (i) => setBatchForms(batchForms.filter((_, idx) => idx !== i));

  const validCount = batchForms.filter(f => f.bet && f.odd).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
          {editId ? "✏️ Edit Bet" : `➕ New Bets (${batchForms.length})`}
        </div>
        {editId && <button onClick={() => { setEditId(null); setBatchForms([emptyBetForm()]); setTab("list"); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>}
      </div>

      {batchForms.map((f, i) => (
        <BetForm key={i} index={i} form={f} onChange={(val) => updateForm(i, val)}
          onRemove={() => removeForm(i)} unitValue={unitValue} canRemove={batchForms.length > 1} />
      ))}

      {!editId && (
        <button onClick={addForm} style={{ background: "#1e293b", border: "1px dashed #334155", borderRadius: 12, padding: "12px", color: "#38bdf8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Add another bet
        </button>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8, position: isDesktop ? "relative" : "sticky", bottom: isDesktop ? "auto" : 90 }}>
        {editId && (
          <button onClick={() => { setEditId(null); setBatchForms([emptyBetForm()]); setTab("list"); }}
            style={{ flex: 1, background: "transparent", border: "1px solid #334155", borderRadius: 12, padding: "12px", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
            Cancel
          </button>
        )}
        <button onClick={handleSaveAll}
          style={{ flex: 2, background: "linear-gradient(135deg, #38bdf8, #818cf8)", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 4px 15px rgba(56,189,248,0.3)" }}>
          {saving ? "Saving..." : editId ? "✓ Update" : validCount > 1 ? `✓ Save ${validCount} bets` : "✓ Save bet"}
        </button>
      </div>
    </div>
  );
}

// LIST TAB
// ════════════════════════════════════════════════════════════════════════════════

const getISOWeek = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  // ISO 8601: week starts Monday, week 1 = week containing first Thursday
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = tmp.getUTCDay() || 7; // Mon=1 ... Sun=7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek); // nearest Thursday
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return { week: weekNo, year: tmp.getUTCFullYear() };
};

const weekKey = (dateStr) => {
  const { week, year } = getISOWeek(dateStr);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

function DayGroup({ date, bets, onEdit, onDelete, onUpdateResult, defaultOpen }) {
  const isToday = date >= today();
  const [open, setOpen] = useState(defaultOpen ?? isToday);
  const profitE = bets.reduce((a, b) => a + calcProfit(b, "E"), 0);
  const profitU = bets.reduce((a, b) => a + calcProfit(b, "U"), 0);
  const settled = bets.filter(b => b.result !== "Pending" && b.result !== "Void");
  const hasSettled = settled.length > 0;
  const d = new Date(date + "T12:00:00");
  const dateLabel = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();

  return (
    <div id={`day-${date}`}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", marginBottom: open ? 8 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase" }}>{dateLabel}</span>
          <span style={{ fontSize: 11, color: "#475569" }}>({bets.length})</span>
          <span style={{ fontSize: 12, color: "#475569" }}>{open ? "▾" : "▸"}</span>
        </div>
        {hasSettled && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(profitE)}€</span>
            <span style={{ fontSize: 11, color: profitU >= 0 ? "#22c55e99" : "#ef444499" }}>{fmt(profitU)}u</span>
          </div>
        )}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
          {bets.map((b) => <BetCard key={b.id} bet={b} onEdit={onEdit} onDelete={onDelete} onUpdateResult={onUpdateResult} />)}
        </div>
      )}
    </div>
  );
}

function WeekGroup({ weekLabel, days, bets, onEdit, onDelete, onUpdateResult, defaultOpen }) {
  const currentWeek = weekKey(today());
  const isCurrentOrFutureWeek = weekLabel >= currentWeek || days.some(d => d >= today());
  const [open, setOpen] = useState(defaultOpen ?? isCurrentOrFutureWeek);
  const profitE = bets.reduce((a, b) => a + calcProfit(b, "E"), 0);
  const profitU = bets.reduce((a, b) => a + calcProfit(b, "U"), 0);
  const settled = bets.filter(b => b.result !== "Pending" && b.result !== "Void");
  const hasSettled = settled.length > 0;

  return (
    <div style={{ background: "#0d1525", borderRadius: 12, border: "1px solid #1e293b", overflow: "hidden", marginBottom: 4 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", letterSpacing: 2, textTransform: "uppercase" }}>{weekLabel}</span>
          <span style={{ fontSize: 11, color: "#475569" }}>· {bets.length} bets</span>
          <span style={{ fontSize: 12, color: "#475569" }}>{open ? "▾" : "▸"}</span>
        </div>
        {hasSettled && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(profitE)}€</span>
            <span style={{ fontSize: 11, color: profitU >= 0 ? "#22c55e99" : "#ef444499" }}>{fmt(profitU)}u</span>
          </div>
        )}
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px" }}>
          {days.map(date => (
            <DayGroup key={date} date={date} bets={bets.filter(b => b.date === date)} onEdit={onEdit} onDelete={onDelete} onUpdateResult={onUpdateResult} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListTab({ bets, onEdit, onDelete, onUpdateResult, onExport, onImport, onDeleteAll, filterMonth, scrollToDate, onScrollDone }) {
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [sportFilter, setSportFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    if (scrollToDate) {
      setTimeout(() => {
        const el = document.getElementById(`day-${scrollToDate}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        onScrollDone?.();
      }, 100);
    }
  }, [scrollToDate]); // "date" | "sport"

  const sports = ["All", ...Object.keys(SPORTS_CONFIG)];
  const filtered = bets
    .filter(b => sportFilter === "All" || b.sport === sportFilter)
    .filter(b => !search || b.bet?.toLowerCase().includes(search.toLowerCase()) || b.league?.toLowerCase().includes(search.toLowerCase()));
  
  const resultOrder = { "Pending": 0, "Win": 1, "Lose": 1, "Void": 2 };

  const sorted = [...filtered].sort((a, b) => {
    // Always: date desc first
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;

    if (sortBy === "sport") {
      const sportCmp = a.sport.localeCompare(b.sport);
      if (sportCmp !== 0) return sportCmp;
    }

    // Within same day (and sport if sportBy): Pending first, then settled
    const resCmp = (resultOrder[a.result] ?? 1) - (resultOrder[b.result] ?? 1);
    if (resCmp !== 0) return resCmp;

    // Within same result group: sort by sport
    const sportCmp = a.sport.localeCompare(b.sport);
    if (sportCmp !== 0) return sportCmp;

    // Finally by created_at
    const caB = b.created_at ?? "";
    const caA = a.created_at ?? "";
    return caB.localeCompare(caA);
  });

  // Group by week then by day (default) OR by sport
  const weeks = {};
  sorted.forEach(b => {
    const wk = sortBy === "sport" ? b.sport : weekKey(b.date);
    if (!weeks[wk]) weeks[wk] = { dates: new Set(), bets: [] };
    weeks[wk].dates.add(b.date);
    weeks[wk].bets.push(b);
  });

  const weekEntries = Object.entries(weeks).sort(([a], [b]) =>
    sortBy === "sport" ? a.localeCompare(b) : b.localeCompare(a)
  );

  const weekLabel = (wk) => {
    if (sortBy === "sport") return wk;
    const [year, wNum] = wk.split("-W");
    return `W${parseInt(wNum)} · ${year}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* toolbar */}
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px", color: "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icons.Upload /> Import CSV
          <input type="file" accept=".csv" onChange={onImport} style={{ display: "none" }} />
        </label>
        <button onClick={onExport} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px", color: "#94a3b8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icons.Download /> Export XLSX
        </button>
        <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? "#38bdf822" : "#1e293b", border: `1px solid ${showFilters ? "#38bdf8" : "#334155"}`, borderRadius: 10, padding: "10px 12px", color: showFilters ? "#38bdf8" : "#94a3b8", fontSize: 13, cursor: "pointer" }}>
          ⚙︎
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <input
          placeholder="🔍  Search bets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 14px", color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ background: "#111827", borderRadius: 12, padding: "12px", border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Filter by sport</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sports.map(s => <Chip key={s} label={s} active={sportFilter === s} onClick={() => setSportFilter(s)} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Sort by</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Chip label="📅 Date" active={sortBy === "date"} onClick={() => setSortBy("date")} />
              <Chip label="🏅 Sport" active={sortBy === "sport"} onClick={() => setSortBy("sport")} />
            </div>
          </div>
        </div>
      )}

      {/* Delete all */}
      {showDeleteAll ? (
        <div style={{ background: "#1e293b", border: "1px solid #ef4444", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>Delete {filterMonth === "all" ? "all" : "this month's"} bets?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteAll(false)} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 10, padding: "10px", color: "#f8fafc", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onDeleteAll(); setShowDeleteAll(false); }} style={{ flex: 1, background: "#ef4444", border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Yes, delete</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowDeleteAll(true)} style={{ background: "none", border: "1px solid #ef444433", borderRadius: 10, padding: "8px", color: "#ef4444", fontSize: 12, cursor: "pointer", width: "100%" }}>
          🗑 Delete {filterMonth === "all" ? "all" : "this month's"} bets
        </button>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div>No bets for this period</div>
        </div>
      )}

      {/* Weeks */}
      {weekEntries.map(([wk, { bets: wBets, dates }]) => {
        const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));
        return (
          <WeekGroup key={wk} weekLabel={weekLabel(wk)} days={sortedDates} bets={wBets} onEdit={onEdit} onDelete={onDelete} onUpdateResult={onUpdateResult} />
        );
      })}
    </div>
  );
}

function BetCard({ bet, onEdit, onDelete, onUpdateResult }) {
  const profitE = calcProfit(bet, "E");
  return (
    <div style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: `1px solid ${RESULT_COLORS[bet.result]}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap" }}>
            <Tag>{bet.sport}</Tag>
            {bet.league && <Tag>{bet.league}</Tag>}
            {bet.subCat && <Tag>{bet.subCat}</Tag>}
            <Tag color={RESULT_COLORS[bet.result]}>{bet.result}</Tag>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, marginBottom: 5 }}>{bet.bet}</div>
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 12 }}>
            <span>@{Number(bet.odd ?? 0).toFixed(3)}</span>
            <span>{Number(bet.stakeE ?? bet.stakee ?? 0).toFixed(0)}€ / {Number(bet.stakeU ?? bet.stakeu ?? 0).toFixed(2)}u</span>
          </div>
          {bet.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{bet.note}</div>}
          {/* Quick result buttons — only show if Pending */}
          {bet.result === "Pending" && (
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {["Win", "Lose", "Void"].map(r => (
                <button key={r} onClick={() => onUpdateResult(bet, r)} style={{
                  background: RESULT_COLORS[r] + "18",
                  border: `1px solid ${RESULT_COLORS[r]}55`,
                  color: RESULT_COLORS[r],
                  borderRadius: 8, padding: "3px 10px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  letterSpacing: 0.3,
                }}>{r}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {bet.result !== "Pending" && bet.result !== "Void" && (
            <div style={{ fontSize: 15, fontWeight: 700, color: profitE >= 0 ? "#22c55e" : "#ef4444" }}>
              {fmt(profitE)}€
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button onClick={() => onEdit(bet)} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "#94a3b8", display: "flex" }}><Icons.Edit s={14} /></button>
            <button onClick={() => onDelete(bet.id)} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: "#ef444499", display: "flex" }}><Icons.Trash s={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ════════════════════════════════════════════════════════════════════════════════
function StatsTab({ total, bySport, byLeague, maxProfitAbs, bkChartData, bankroll, updateBankroll, allMonths, statsTab, setStatsTab, bets, dailyChartData, oddsRanges, filterMonth }) {
  const [bkEdit, setBkEdit] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [bkForm, setBkForm] = useState({ start: "", end: "", unitValue: "", fees: "" });

  const openBkEdit = (mk) => {
    setBkEdit(mk);
    const bk = bankroll[mk] ?? {};
    setBkForm({ start: bk.start ?? "", end: bk.end ?? "", unitValue: bk.unitValue ?? "", fees: bk.fees ?? "" });
  };
  const saveBk = () => {
    const entry = { start: Number(bkForm.start), end: Number(bkForm.end), unitValue: Number(bkForm.unitValue), fees: Number(bkForm.fees) };
    const isEmpty = [bkForm.start, bkForm.end, bkForm.unitValue, bkForm.fees].every(v => v === "" || v === "0" || Number(v) === 0);
    if (isEmpty) {
      const next = { ...bankroll };
      delete next[bkEdit];
      updateBankroll(next);
    } else {
      updateBankroll({ ...bankroll, [bkEdit]: entry });
    }
    setBkEdit(null);
  };

  // Running balance per month = start BK + profit from bets
  const runningBalance = (mk) => {
    const bk = bankroll[mk] ?? {};
    if (!bk.start) return null;
    const profit = bets.filter((b) => monthKey(b.date) === mk).reduce((acc, b) => acc + calcProfit(b, "E"), 0);
    const fees = Number(bk.fees ?? 0);
    return bk.start + profit - fees;
  };

  const renderGroup = (map, maxAbs) => Object.entries(map).map(([name, s]) => {
    const settled = s.bets.filter((b) => b.result !== "Void" && b.result !== "Pending").length;
    const wr = settled ? (s.wins / settled) * 100 : 0;
    const avgOdd = s.oddsCount ? s.oddsSum / s.oddsCount : 0;
    const avgStakeU = settled && s.totalInvU ? s.totalInvU / settled : 0;
    return (
      <div key={name} style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: s.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(s.profitE)}€</div>
        </div>
        <div style={{ height: 5, background: "#1e293b", borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.abs(s.profitE / maxAbs) * 100}%`, height: "100%", background: s.profitE >= 0 ? "#22c55e" : "#ef4444", borderRadius: 3 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11, color: "#64748b" }}>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{s.bets.length}</div>Bets</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{s.wins}</div>Wins</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{fmtAbs(wr)}%</div>Win %</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{fmtAbs(s.totalInvE)}€</div>Invested</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{fmt(s.profitU)}u</div>Profit u</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{fmtAbs(avgOdd)}</div>Avg Odd</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{fmtAbs(avgStakeU)}u</div>Avg Stake</div>
          <div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{s.totalInvE ? fmt(s.profitE / s.totalInvE * 100) : "–"}%</div>ROI</div>
        </div>
      </div>
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* GLOBAL KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <KPI label="Bets" value={total.total} />
        <KPI label="Wins" value={total.wins} color="#22c55e" />
        <KPI label="Win %" value={fmtAbs(total.winRate) + "%"} color={total.winRate >= 50 ? "#22c55e" : "#ef4444"} />
        <KPI label="Avg Odd" value={fmtAbs(total.avgOdd)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <KPI label="Profit €" value={fmt(total.profitE) + "€"} color={total.profitE >= 0 ? "#22c55e" : "#ef4444"} large />
        <KPI label="Profit u" value={fmt(total.profitU) + "u"} color={total.profitU >= 0 ? "#22c55e" : "#ef4444"} large />
        <KPI label="ROI" value={fmt(total.roi) + "%"} color={total.roi >= 0 ? "#22c55e" : "#ef4444"} large />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <KPI label="Total Invested" value={fmtAbs(total.totalInvE) + "€"} />
        <KPI label="Avg Stake" value={fmtAbs(total.avgStakeU) + "u"} />
      </div>

      {/* SHARE CARD */}
      <button onClick={() => setShowShare(true)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "10px 14px", color: "#94a3b8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}>
        📊 {filterMonth === "all" ? "Share All Time Stats" : "Share Monthly Summary"}
      </button>

      {/* SUB-TABS */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>
        {[["bk", "Bankroll"], ["sport", "By Sport"], ["league", "By League"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatsTab(k)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: statsTab === k ? "#38bdf8" : "#475569", borderBottom: statsTab === k ? "2px solid #38bdf8" : "2px solid transparent", paddingBottom: 4 }}>{l}</button>
        ))}
      </div>

      {statsTab === "sport" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderGroup(bySport, maxProfitAbs)}
          {Object.keys(bySport).length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>No data</div>}
        </div>
      )}

      {statsTab === "sport" && oddsRanges.length > 0 && (
        <div style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Performance by Odds Range</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {oddsRanges.map(r => (
              <div key={r.label} style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px 60px 60px", gap: 6, alignItems: "center", fontSize: 12 }}>
                <div style={{ color: "#38bdf8", fontWeight: 700 }}>{r.label}</div>
                <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(Math.abs(r.roi), 100)}%`, height: "100%", background: r.profitE >= 0 ? "#22c55e" : "#ef4444", borderRadius: 3 }} />
                </div>
                <div style={{ color: "#94a3b8", textAlign: "right" }}>{r.bets}b</div>
                <div style={{ color: "#94a3b8", textAlign: "right" }}>{r.wr.toFixed(0)}%</div>
                <div style={{ color: r.roi >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, textAlign: "right" }}>{r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px 60px 60px", gap: 6, fontSize: 10, color: "#475569", marginTop: 2 }}>
              <div></div><div></div><div style={{ textAlign: "right" }}>Bets</div><div style={{ textAlign: "right" }}>WR</div><div style={{ textAlign: "right" }}>ROI</div>
            </div>
          </div>
        </div>
      )}

      {statsTab === "league" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderGroup(byLeague, Math.max(...Object.values(byLeague).map((s) => Math.abs(s.profitE)), 1))}
          {Object.keys(byLeague).length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>No data</div>}
        </div>
      )}

      {statsTab === "bk" && (
        <>
          {/* CHART */}
          <div style={{ background: "#111827", borderRadius: 12, padding: 14, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Bankroll Evolution</div>
            <Sparkline data={bkChartData} />
            {bkChartData.length > 0 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10 }}>
                {bkChartData.map((d) => (
                  <div key={d.mk} style={{ textAlign: "center", flexShrink: 0, minWidth: 52 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{d.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{d.bk.toLocaleString()}€</div>
                    <div style={{ fontSize: 10, color: d.profit >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(d.profit)}€</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DAILY PROFIT CHART */}
          <div style={{ background: "#111827", borderRadius: 12, padding: 14, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Daily Profit Evolution {filterMonth !== "all" ? "" : "(All Time)"}
            </div>
            <LineChart data={dailyChartData} valueKey="value" colorKey="profit"
              emptyMsg="No settled bets yet" color="#a78bfa" H={90} />
            {dailyChartData.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                <span style={{ color: "#64748b" }}>Start: <b style={{ color: "#e2e8f0" }}>0€</b></span>
                <span style={{ color: "#64748b" }}>Now: <b style={{ color: dailyChartData[dailyChartData.length-1]?.value >= 0 ? "#22c55e" : "#ef4444" }}>{dailyChartData[dailyChartData.length-1]?.value >= 0 ? "+" : ""}{dailyChartData[dailyChartData.length-1]?.value?.toFixed(2)}€</b></span>
              </div>
            )}
          </div>

          {/* ADD MONTH BK BUTTON */}
          <button onClick={() => {
            const mk = monthKey(today());
            openBkEdit(mk);
          }} style={{ background: "#1e293b", border: "1px dashed #334155", borderRadius: 12, padding: "12px", color: "#38bdf8", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
            + Setup current month bankroll
          </button>

          {/* MONTHLY BK */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allMonths.map((mk) => {
              const bk = bankroll[mk] ?? {};
              const running = runningBalance(mk);
              return (
                <div key={mk} style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{monthLabel(mk)}</div>
                    <button onClick={() => openBkEdit(mk)} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "4px 12px", color: "#38bdf8", fontSize: 12, cursor: "pointer" }}>Edit</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                    <div style={{ color: "#64748b" }}>Start: <b style={{ color: "#e2e8f0" }}>{bk.start ? bk.start.toLocaleString() + "€" : "–"}</b></div>
                    <div style={{ color: "#64748b" }}>End: <b style={{ color: "#e2e8f0" }}>{bk.end ? bk.end.toLocaleString() + "€" : "–"}</b></div>
                    <div style={{ color: "#64748b" }}>1u = <b style={{ color: "#38bdf8" }}>{bk.unitValue ? bk.unitValue + "€" : "–"}</b></div>
                    <div style={{ color: "#64748b" }}>Fees: <b style={{ color: "#ef4444" }}>{bk.fees ? "-" + bk.fees + "€" : "–"}</b></div>
                  </div>
                  {running !== null && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Running Balance</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: bk.end ? (running >= bk.end ? "#22c55e" : "#f59e0b") : "#e2e8f0" }}>
                        {running.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Show months with BK config but no bets — only if they have actual data */}
            {Object.keys(bankroll).filter(mk => !allMonths.includes(mk) && (bankroll[mk]?.start || bankroll[mk]?.unitValue)).map(mk => {
              const bk = bankroll[mk] ?? {};
              return (
                <div key={mk} style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{monthLabel(mk)}</div>
                    <button onClick={() => openBkEdit(mk)} style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "4px 12px", color: "#38bdf8", fontSize: 12, cursor: "pointer" }}>Edit</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                    <div style={{ color: "#64748b" }}>Start: <b style={{ color: "#e2e8f0" }}>{bk.start ? bk.start.toLocaleString() + "€" : "–"}</b></div>
                    <div style={{ color: "#64748b" }}>1u = <b style={{ color: "#38bdf8" }}>{bk.unitValue ? bk.unitValue + "€" : "–"}</b></div>
                  </div>
                </div>
              );
            })}
            {allMonths.length === 0 && Object.keys(bankroll).length === 0 && (
              <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>No months yet — click "Setup current month" above</div>
            )}
          </div>
        </>
      )}

      {/* SHARE MODAL */}
      {showShare && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            {/* Share card — screenshot this */}
            <div id="share-card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2744 100%)", borderRadius: 20, padding: 24, border: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: "#38bdf8", textTransform: "uppercase" }}>JojoH Betting Tracker</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>
                    {filterMonth !== "all" ? monthLabel(filterMonth) : "All Time"}
                  </div>
                </div>
                <div style={{ fontSize: 28 }}>🎯</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Profit", value: (total.profitE >= 0 ? "+" : "") + total.profitE.toFixed(2) + "€", color: total.profitE >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "Profit u", value: (total.profitU >= 0 ? "+" : "") + total.profitU.toFixed(2) + "u", color: total.profitU >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "ROI", value: (total.roi >= 0 ? "+" : "") + total.roi.toFixed(2) + "%", color: total.roi >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "Win Rate", value: total.winRate.toFixed(1) + "%", color: total.winRate >= 50 ? "#22c55e" : "#f59e0b" },
                  { label: "Bets", value: total.total, color: "#f8fafc" },
                  { label: "Avg Odd", value: total.avgOdd.toFixed(2), color: "#f8fafc" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {Object.entries(bySport).slice(0, 3).map(([sport, s]) => (
                <div key={sport} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e293b", fontSize: 13 }}>
                  <span style={{ color: "#94a3b8" }}>{sport}</span>
                  <span style={{ fontWeight: 700, color: s.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{s.profitE >= 0 ? "+" : ""}{s.profitE.toFixed(2)}€</span>
                </div>
              ))}

              <div style={{ marginTop: 16, fontSize: 10, color: "#475569", textAlign: "center" }}>betting-tracker-one.vercel.app</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowShare(false)} style={{ flex: 1, background: "#1e293b", border: "none", borderRadius: 12, padding: "12px", color: "#94a3b8", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>Close</button>
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "JojoH Betting Tracker", text: `${filterMonth !== "all" ? monthLabel(filterMonth) : "All Time"} — Profit: ${total.profitE >= 0 ? "+" : ""}${total.profitE.toFixed(2)}€ | ROI: ${total.roi.toFixed(2)}% | WR: ${total.winRate.toFixed(1)}%` });
                } else {
                  navigator.clipboard.writeText(`${filterMonth !== "all" ? monthLabel(filterMonth) : "All Time"} — Profit: ${total.profitE >= 0 ? "+" : ""}${total.profitE.toFixed(2)}€ | ROI: ${total.roi.toFixed(2)}% | WR: ${total.winRate.toFixed(1)}%`);
                  alert("Copied to clipboard!");
                }
              }} style={{ flex: 2, background: "#38bdf8", border: "none", borderRadius: 12, padding: "12px", color: "#0a0f1e", fontSize: 14, cursor: "pointer", fontWeight: 800 }}>
                Share 📤
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 8 }}>Take a screenshot of the card above to share as image</div>
          </div>
        </div>
      )}

      {/* BK EDIT MODAL */}
      {bkEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, margin: 20, border: "1px solid #334155", maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Bankroll — {monthLabel(bkEdit)}</div>
            {[["start", "Starting bankroll (€)"], ["end", "End bankroll (€)"], ["unitValue", "1 unit = (€)"], ["fees", "Fees PS3838 (€)"]].map(([k, lbl]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <Input label={lbl} type="number" value={bkForm[k]} onChange={(e) => setBkForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn onClick={() => {
                const next = { ...bankroll };
                delete next[bkEdit];
                updateBankroll(next);
                setBkEdit(null);
              }} bg="#ef444422" color="#ef4444" flex={1}>Delete</Btn>
              <Btn onClick={() => setBkEdit(null)} flex={1}>Cancel</Btn>
              <Btn onClick={saveBk} bg="#38bdf8" color="#0a0f1e" flex={1}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
