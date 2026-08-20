import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  bg:        "#080e1a",
  card:      "#0f1923",
  card2:     "#131e2b",
  border:    "#1a2a3a",
  border2:   "#243548",
  accent:    "#00d4aa",
  accentDim: "#00d4aa22",
  win:       "#00c896",
  lose:      "#ff6b35",
  void:      "#6b7a8d",
  pending:   "#f0a500",
  text:      "#f0f4f8",
  text2:     "#7a9ab0",
  text3:     "#3d5a70",
};

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
    leagues: ["ATP", "WTA", "Mixed", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"],
  },
  Baseball: {
    leagues: ["MLB", "KBO", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"],
  },
  Soccer: {
    leagues: ["Ligue 1", "Ligue 2", "Ligue 3", "BPL", "Liga", "Primeira Liga", "Serie A", "Bundesliga", "Champions League", "Europa League", "Conference League", "World Cup", "MLS", "National Cup", "Exhibition", "Exotique", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"],
  },
  "US Football": {
    leagues: ["NFL", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Outright", "Parlay", "System 2/3"],
  },
  Basketball: {
    leagues: ["NBA", "WNBA", "EuroLeague", "Autre", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Outright", "Parlay", "System 2/3"],
  },
  Hockey: {
    leagues: ["NHL", "Magnus", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"],
  },
  MMA: {
    leagues: ["UFC", "PreSeason"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"],
  },
  eSport: { leagues: ["CS2", "LoL", "Dota 2", "Mixed", "Autre", "PreSeason"], subCats: ["ML", "AH", "O/U", "Boost", "Outright", "Parlay", "System 2/3"] },
  "Mixed Sports": { leagues: ["Mixed", "PreSeason"], subCats: ["Boost", "Parlay", "System 2/3"] },
  "F1": { leagues: ["F1", "PreSeason"], subCats: ["Boost", "Outright", "System 2/3"] },
  Cycling: { leagues: ["Tour de France", "Giro", "Vuelta", "Autre", "PreSeason"], subCats: ["Boost", "Outright", "System 2/3"] },
  Athletism: { leagues: ["European Games", "World Games", "Olympic Games", "PreSeason"], subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright", "System 2/3"] },
};

const SPORTS = Object.keys(SPORTS_CONFIG);
const BOOKS = ["PS3838", "Betclic", "Unibet", "Winamax", "PMU", "PokerStars", "Bet365", "Yonibet", "Autre"];

const BOOK_COLORS = {
  PS3838:     { bg: "#1a3a6b", text: "#ffffff", accent: "#4d8ef0" },
  Betclic:    { bg: "#e8001c", text: "#ffffff", accent: "#ff4d63" },
  Unibet:     { bg: "#007832", text: "#ffffff", accent: "#00a846" },
  Winamax:    { bg: "#f4600c", text: "#ffffff", accent: "#ff8c42" },
  PMU:        { bg: "#006eb7", text: "#ffffff", accent: "#3da5e8" },
  PokerStars: { bg: "#c00", text: "#ffffff", accent: "#ff4444" },
  Bet365:     { bg: "#006400", text: "#ffffff", accent: "#00a000" },
  Yonibet:    { bg: "#7b2fd4", text: "#ffffff", accent: "#a855f7" },
  Autre:      { bg: "#334155", text: "#e2e8f0", accent: "#94a3b8" },
};
const bookColor = (book) => BOOK_COLORS[book] ?? { bg: "#1e293b", text: "#e2e8f0", accent: "#38bdf8" };
const RESULTS = ["Pending", "Win", "Lose", "Void", "Cashout"];

const RESULT_COLORS = {
  Win: "#22c55e",
  Lose: "#ef4444",
  Void: "#94a3b8",
  Pending: "#f59e0b",
  Cashout: "#06b6d4",
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

const emptyLeg = () => ({ bet: "", odd: "", result: "Pending" });
const emptyBetForm = (overrides = {}, unitValue = null) => ({
  date: today(),
  sport: "Tennis",
  league: "ATP",
  subCat: "ML",
  bet: "",
  odd: "",
  stakeE: unitValue ?? 60,
  stakeU: 1,
  result: "Pending",
  note: "",
  isFreebet: false,
  alreadyAccounted: false,
  comboBooster: "",
  book: "PS3838",
  system23Legs: [emptyLeg(), emptyLeg(), emptyLeg()],
  cashoutAmount: "",
  ...overrides,
});

const calcSystem23Profit = (legs, stake) => {
  if (!legs || legs.length !== 3) return 0;
  const pairs = [[0,1], [0,2], [1,2]];
  const stakePerCombo = stake / 3;
  let totalReturn = 0;
  let hasPending = false;

  for (const [i, j] of pairs) {
    const l1 = legs[i], l2 = legs[j];
    if (l1.result === "Pending" || l2.result === "Pending") {
      hasPending = true;
      continue;
    }
    if (l1.result === "Win" && l2.result === "Win") {
      totalReturn += stakePerCombo * (Number(l1.odd) * Number(l2.odd));
    }
  }

  if (hasPending) return 0;
  return totalReturn - stake;
};

// ── STORAGE ───────────────────────────────────────────────────────────────────
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
  const isFB = bet.isFreebet ?? bet.is_freebet ?? false;
  const isAccounted = bet.alreadyAccounted ?? bet.already_accounted ?? false;
  const booster = Number(bet.comboBooster ?? bet.combo_booster ?? 0);
  const boostMult = 1 + booster / 100;

  const legs = bet.system23Legs ?? bet.system23_legs ?? null;
  if ((bet.subCat ?? bet.subcat) === "System 2/3" && legs?.length === 3) {
    const p = calcSystem23Profit(legs, stake);
    return p ?? 0;
  }
  if (bet.result === "Cashout") {
    const co = field === "E"
      ? Number(bet.cashoutAmount ?? bet.cashout_amount ?? 0)
      : Number(bet.cashoutAmountU ?? (bet.cashoutAmount ?? bet.cashout_amount ?? 0) / 60);
    return co;
  }
  if (bet.result === "Win") return isAccounted
    ? Number(bet.odd) * stake * boostMult
    : (Number(bet.odd) - 1) * stake * boostMult;
  if (bet.result === "Lose") return (isAccounted || isFB) ? 0 : -stake;
  return 0;
};

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
const LineChart = ({ data, valueKey = "bk", colorKey = "profit", emptyMsg, color = "#2dd4bf", H = 140 }) => {
  if (!data || data.length < 2) return (
    <div style={{ textAlign: "center", color: T.text3, padding: "24px 0", fontSize: 13 }}>
      {emptyMsg ?? "Not enough data"}
    </div>
  );
  const vals = data.map((d) => d[valueKey]);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const padding = (rawMax - rawMin) * 0.12 || 50;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min;

  const W = 340, padLeft = 48, padRight = 12, padTop = 12, padBottom = 24;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const toX = (i) => padLeft + (i / (data.length - 1)) * chartW;
  const toY = (v) => padTop + chartH - ((v - min) / range) * chartH;

  const pts = data.map((d, i) => [toX(i), toY(d[valueKey])]);

  const pathD = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cp1x = px + (x - px) * 0.5;
    const cp2x = x - (x - px) * 0.5;
    return `${acc} C${cp1x},${py} ${cp2x},${y} ${x},${y}`;
  }, "");

  const areaD = `${pathD} L${pts[pts.length-1][0]},${padTop + chartH} L${pts[0][0]},${padTop + chartH} Z`;

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const t = i / gridCount;
    const v = min + range * t;
    return { y: padTop + chartH * (1 - t), v };
  });

  const [lx, ly] = pts[pts.length - 1];
  const lineColor = color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="lg-chart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="75%" stopColor={lineColor} stopOpacity="0.05" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {gridLines.map(({ y, v }, i) => (
        <g key={i}>
          <line x1={padLeft} y1={y} x2={W - padRight} y2={y}
            stroke="#ffffff08" strokeWidth={i === 0 ? 0 : 1} />
          <text x={padLeft - 6} y={y + 3} fontSize="8" fill="#334155"
            textAnchor="end" fontFamily="monospace">
            {v >= 1000 ? `${(v/1000).toFixed(1)}k` : Math.round(v)}
          </text>
        </g>
      ))}

      {min < 0 && max > 0 && (
        <line x1={padLeft} y1={toY(0)} x2={W - padRight} y2={toY(0)}
          stroke="#ffffff18" strokeWidth="1" strokeDasharray="3,3" />
      )}

      <path d={areaD} fill="url(#lg-chart)" />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />

      <circle cx={lx} cy={ly} r={3} fill={lineColor} />
      <circle cx={lx} cy={ly} r={6} fill={lineColor} opacity={0.2} />
    </svg>
  );
};

const Sparkline = ({ data }) => <LineChart data={data} valueKey="bk" colorKey="profit" emptyMsg="Fill in monthly bankroll end values to see the chart" color="#2dd4bf" />;

// ── STAT ROW ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, color, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
      <div>
        <div style={{ fontSize: 13, color: T.text2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: T.text3 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? "#f8fafc" }}>{value}</div>
    </div>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────────
function KPI({ label, value, color, large }) {
  return (
    <div style={{ background: T.card, borderRadius: 10, padding: large ? "14px 14px" : "11px 12px", border: `1px solid ${T.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: large ? 19 : 16, fontWeight: 800, color: color ?? T.text, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>{value}</div>
    </div>
  );
}

// ── TAG ───────────────────────────────────────────────────────────────────────
const Tag = ({ children, color }) => (
  <span style={{
    fontSize: 10, borderRadius: 4, padding: "2px 7px",
    background: color ? color + "18" : T.card2,
    color: color ?? T.text2,
    border: `1px solid ${color ? color + "35" : T.border}`,
    fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase",
  }}>{children}</span>
);

// ── CHIP ──────────────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    background: active ? (color ?? T.accent) + "20" : "transparent",
    border: `1px solid ${active ? (color ?? T.accent) : T.border}`,
    color: active ? (color ?? T.accent) : T.text2,
    borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer",
    whiteSpace: "nowrap", transition: "all .15s", fontWeight: active ? 700 : 400,
    letterSpacing: 0.2,
  }}>{label}</button>
);

const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? T.accent : "transparent",
    border: `1px solid ${active ? T.accent : T.border2}`,
    color: active ? T.bg : T.text3,
    borderRadius: 20, padding: "4px 14px", fontSize: 11, cursor: "pointer",
    whiteSpace: "nowrap", fontWeight: active ? 700 : 500,
    letterSpacing: 0.3, transition: "all .15s",
  }}>{label}</button>
);

const Input = ({ label, ...props }) => (
  <div>
    {label && <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontWeight: 600 }}>{label}</div>}
    <input style={{
      width: "100%", background: T.card2, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 14,
      outline: "none", boxSizing: "border-box", WebkitAppearance: "none",
      transition: "border-color .15s",
    }} {...props} />
  </div>
);

const Btn = ({ children, onClick, bg, color, flex }) => (
  <button onClick={onClick} style={{
    background: bg ?? T.card2, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "11px 16px", color: color ?? T.text2,
    fontSize: 13, cursor: "pointer", fontWeight: 600,
    flex: flex ?? "unset", width: flex ? "100%" : "auto",
    letterSpacing: 0.3, transition: "all .15s",
  }}>{children}</button>
);

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
  const [bankroll, setBankrollState] = useState({});
  const [bookConfig, setBookConfigState] = useState({});
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState(monthKey(today()));
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const unitValue = bankroll.global?.unitValue ?? null;
  const [batchForms, setBatchForms] = useState([emptyBetForm({}, unitValue)]);

  useEffect(() => {
    if (!unitValue) return;
    setBatchForms(prev => prev.map(f =>
      f.stakeE === 60 || f.stakeE === "" ? { ...f, stakeE: unitValue } : f
    ));
  }, [unitValue]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data: betsData, error: betsError } = await supabase.from("bets").select("*").order("date", { ascending: false });
      if (betsData) setBets(betsData.map(b => ({
        ...b,
        subCat: b.subcat ?? "",
        stakeE: Number(b.stakee ?? 0),
        stakeU: Number(b.stakeu ?? 0),
        isFreebet: b.is_freebet ?? false,
        alreadyAccounted: b.already_accounted ?? false,
        system23Legs: b.system23_legs ? (typeof b.system23_legs === "string" ? JSON.parse(b.system23_legs) : b.system23_legs) : null,
        cashoutAmount: b.cashout_amount ?? "",
        comboBooster: Number(b.combo_booster ?? 0),
        book: b.book ?? "",
      })));
      if (betsError) console.error("Bets load error:", betsError);

      const { data: settingsData } = await supabase.from("settings").select("value").eq("key", "bankroll").single();
      if (settingsData?.value) {
        try { setBankrollState(JSON.parse(settingsData.value)); } catch {}
      } else {
        const local = load("bankroll_v2", {});
        if (Object.keys(local).length > 0) setBankrollState(local);
      }

      const { data: bookData } = await supabase.from("settings").select("value").eq("key", "bookConfig").single();
      if (bookData?.value) {
        try { setBookConfigState(JSON.parse(bookData.value)); } catch {}
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleSaveAll = async () => {
    if (saving) return;
    const valid = batchForms.filter(f => {
      if ((f.subCat ?? f.subcat) === "System 2/3") {
        const legs = f.system23Legs ?? [];
        return f.bet && legs.length === 3 && legs.every(l => l.bet && l.odd);
      }
      return f.bet && f.odd;
    });
    if (!valid.length) return;
    setSaving(true);
    if (editId !== null) {
      const f = valid[0];
      const stakeU = unitValue ? (Number(f.stakeE) / unitValue).toFixed(3) : f.stakeU;
      const isSystem = (f.subCat ?? f.subcat) === "System 2/3";
      const legs = f.system23Legs ?? [];
      const sysResult = isSystem ? (() => {
        const pairs = [[0,1],[0,2],[1,2]];
        const anyPending = legs.some(l => !l.result || l.result === "Pending");
        if (anyPending) return "Pending";
        const anyWin = pairs.some(([i,j]) => legs[i].result === "Win" && legs[j].result === "Win");
        return anyWin ? "Win" : "Lose";
      })() : (f.result || "Pending");
      const entry = {
        date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "",
        bet: f.bet, odd: isSystem ? 0 : Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0),
        stakeu: Number(stakeU), result: sysResult, note: f.note ?? "", is_freebet: f.isFreebet ?? false,
        combo_booster: Number(f.comboBooster ?? 0), book: f.book ?? "", already_accounted: f.alreadyAccounted ?? false,
        system23_legs: isSystem ? JSON.stringify(legs) : null,
        cashout_amount: f.result === "Cashout" ? Number(f.cashoutAmount ?? 0) : null
      };
      const { error } = await supabase.from("bets").update(entry).eq("id", editId);
      if (!error) setBets(bets.map((b) => (b.id === editId ? { ...entry, id: editId } : b)));
      else alert("Error saving: " + error.message);
      setEditId(null);
    } else {
      const newEntries = valid.map((f) => {
        const stakeU = unitValue ? (Number(f.stakeE ?? f.stakee) / unitValue).toFixed(3) : (f.stakeU ?? f.stakeu ?? 1);
        return {
          date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "",
          bet: f.bet, odd: Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0), stakeu: Number(stakeU),
          result: f.result || "Pending", note: f.note ?? "", is_freebet: f.isFreebet ?? false,
          combo_booster: Number(f.comboBooster ?? 0), already_accounted: f.alreadyAccounted ?? false, book: f.book ?? ""
        };
      });
      const { data, error } = await supabase.from("bets").insert(newEntries).select();
      if (data) setBets([...data.map(b => ({
        ...b, subCat: b.subcat ?? "", stakeE: Number(b.stakee ?? 0), stakeU: Number(b.stakeu ?? 0),
        isFreebet: b.is_freebet ?? false, alreadyAccounted: b.already_accounted ?? false, book: b.book ?? "",
        system23Legs: b.system23_legs ? (typeof b.system23_legs === "string" ? JSON.parse(b.system23_legs) : b.system23_legs) : null,
        cashoutAmount: b.cashout_amount ?? ""
      })), ...bets]);
      else alert("Error saving: " + error.message);
    }
    setBatchForms([emptyBetForm({}, unitValue)]);
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

  const deleteBet = async (id) => {
    const { error } = await supabase.from("bets").delete().eq("id", id);
    if (!error) setBets(bets.filter((b) => b.id !== id));
    else alert("Error deleting: " + error.message);
    setDeleteConfirm(null);
  };

  const filtered = useMemo(() =>
    filterMonth === "all" ? bets : bets.filter((b) => monthKey(b.date) === filterMonth),
    [bets, filterMonth]);

  const groupStats = (bets, key) => {
    const map = {};
    bets.forEach((b) => {
      let k;
      if (key === "league") k = b.league || b.sport || "–";
      else if (key === "subCat") k = b.subCat || b.subcat || "–";
      else if (key === "book") k = b.book || "Unknown";
      else k = b[key] || "–";
      if (!map[k]) map[k] = { bets: [], wins: 0, profitE: 0, profitU: 0, totalInvE: 0, totalInvU: 0, oddsSum: 0, oddsCount: 0 };
      const s = map[k];
      s.bets.push(b);
      if (b.result === "Win") { s.wins++; s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose" || b.result === "Cashout") { s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      if (b.result !== "Void") {
        const isFB = b.isFreebet ?? b.is_freebet ?? false;
        const isAcc = b.alreadyAccounted ?? b.already_accounted ?? false;
        if (!isFB && !isAcc) s.totalInvE += Number(b.stakeE ?? b.stakee ?? 0);
        s.totalInvU += Number(b.stakeU ?? b.stakeu ?? 0);
      }
      if (b.odd) { s.oddsSum += Number(b.odd); s.oddsCount++; }
    });
    return map;
  };

  const bySport = useMemo(() => groupStats(filtered, "sport"), [filtered]);
  const byLeague = useMemo(() => groupStats(filtered, "league"), [filtered]);
  const bySubCat = useMemo(() => {
    const map = groupStats(filtered, "subCat");
    delete map["–"];
    return map;
  }, [filtered]);
  const byBook = useMemo(() => groupStats(filtered, "book"), [filtered]);

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", color: T.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading data...
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "sans-serif", padding: 16 }}>
      {/* Header Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Pill label="Add Bet" active={tab === "add"} onClick={() => setTab("add")} />
        <Pill label="Bets List" active={tab === "list"} onClick={() => setTab("list")} />
        <Pill label="Stats" active={tab === "stats"} onClick={() => setTab("stats")} />
      </div>

      {/* Tab Contents */}
      {tab === "add" && (
        <div style={{ background: T.card, padding: 16, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <h3>{editId ? "Edit Bet" : "Add New Bet"}</h3>
          {batchForms.map((f, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <Input label="Bet Description" value={f.bet} onChange={e => {
                const next = [...batchForms];
                next[i].bet = e.target.value;
                setBatchForms(next);
              }} />
              <Input label="Odds" type="number" step="0.01" value={f.odd} onChange={e => {
                const next = [...batchForms];
                next[i].odd = e.target.value;
                setBatchForms(next);
              }} />
              <Input label="Stake (€)" type="number" value={f.stakeE} onChange={e => {
                const next = [...batchForms];
                next[i].stakeE = e.target.value;
                setBatchForms(next);
              }} />
            </div>
          ))}
          <Btn bg={T.accent} color={T.bg} onClick={handleSaveAll}>{saving ? "Saving..." : "Save Bet"}</Btn>
        </div>
      )}

      {tab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ color: T.text3 }}>No bets found for this period.</div>
          ) : (
            filtered.map((b) => (
              <div key={b.id} style={{ background: T.card, padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.bet}</div>
                  <div style={{ fontSize: 12, color: T.text2 }}>{b.sport} • {b.league} • {b.date}</div>
                </div>
                <div style={{ textAlign: "end" }}>
                  <div style={{ color: RESULT_COLORS[b.result] ?? T.text, fontWeight: 700 }}>{b.result}</div>
                  <div style={{ fontSize: 12, color: T.text2 }}>@{b.odd} | {b.stakeE}€</div>
                  <button style={{ background: "transparent", border: "none", color: T.lose, cursor: "pointer", marginTop: 4 }} onClick={() => deleteBet(b.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.card, padding: 16, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <h3>Overall Performance</h3>
            {Object.keys(bySport).map(sport => (
              <StatRow 
                key={sport} 
                label={sport} 
                value={fmt(bySport[sport].profitE) + " €"} 
                color={bySport[sport].profitE >= 0 ? T.win : T.lose} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
