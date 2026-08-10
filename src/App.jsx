import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  bg:       "#080e1a",
  card:     "#0f1923",
  card2:    "#131e2b",
  border:   "#1a2a3a",
  border2:  "#243548",
  accent:   "#00d4aa",
  accentDim:"#00d4aa22",
  win:      "#00c896",
  lose:     "#ff6b35",
  void:     "#6b7a8d",
  pending:  "#f0a500",
  text:     "#f0f4f8",
  text2:    "#7a9ab0",
  text3:    "#3d5a70",
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
    leagues: ["ATP", "WTA", "Mixed"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright"],
  },
  Baseball: {
    leagues: ["MLB", "KBO"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright"],
  },
  Soccer: {
    leagues: ["Ligue 1", "Ligue 2", "Ligue 3", "BPL", "Liga", "Primeira Liga", "Serie A", "Bundesliga", "Champions League", "Europa League", "Conference League", "World Cup", "MLS", "National Cup", "Exhibition", "Exotique"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright"],
  },
  "US Football": {
    leagues: ["NFL"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Outright", "Parlay"],
  },
  Basketball: {
    leagues: ["NBA", "WNBA", "EuroLeague", "Autre"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Outright", "Parlay"],
  },
  Hockey: {
    leagues: ["NHL", "Magnus"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright"],
  },
  MMA: {
    leagues: ["UFC"],
    subCats: ["ML", "AH", "O/U", "Player Props", "Team Props", "Boost", "Parlay", "Outright"],
  },
  eSport: { leagues: ["CS2", "LoL", "Dota 2", "Mixed", "Autre"], subCats: ["ML", "AH", "O/U", "Boost", "Outright", "Parlay"] },
  "Mixed Sports": { leagues: ["Mixed"], subCats: ["Boost", "Parlay"] },
  "F1": { leagues: ["F1"], subCats: ["Boost", "Outright"] },
  Cycling: { leagues: ["Tour de France", "Giro", "Vuelta", "Autre"], subCats: ["Boost", "Outright"] },
};

const SPORTS = Object.keys(SPORTS_CONFIG);
const BOOKS = ["PS3838", "Betclic", "Unibet", "Winamax", "PMU", "PokerStars", "Bet365", "Yonibet", "Autre"];

// Brand colors extracted from each bookmaker's logo/identity
const BOOK_COLORS = {
  PS3838:      { bg: "#1a3a6b", text: "#ffffff", accent: "#4d8ef0" }, // Pinnacle blue
  Betclic:     { bg: "#e8001c", text: "#ffffff", accent: "#ff4d63" }, // Betclic red
  Unibet:      { bg: "#007832", text: "#ffffff", accent: "#00a846" }, // Unibet green
  Winamax:     { bg: "#f4600c", text: "#ffffff", accent: "#ff8c42" }, // Winamax orange
  PMU:         { bg: "#006eb7", text: "#ffffff", accent: "#3da5e8" }, // PMU blue
  PokerStars:  { bg: "#c00", text: "#ffffff", accent: "#ff4444" },    // PokerStars red
  Bet365:      { bg: "#006400", text: "#ffffff", accent: "#00a000" }, // Bet365 green
  Yonibet:     { bg: "#7b2fd4", text: "#ffffff", accent: "#a855f7" }, // Yonibet purple
  Autre:       { bg: "#334155", text: "#e2e8f0", accent: "#94a3b8" }, // Neutral slate
};
const bookColor = (book) => BOOK_COLORS[book] ?? { bg: "#1e293b", text: "#e2e8f0", accent: "#38bdf8" };
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
  const isFB = bet.isFreebet ?? bet.is_freebet ?? false;
  const isAccounted = bet.alreadyAccounted ?? bet.already_accounted ?? false;
  const booster = Number(bet.comboBooster ?? bet.combo_booster ?? 0);
  const boostMult = 1 + booster / 100;
  if (bet.result === "Win") return isAccounted
    ? Number(bet.odd) * stake * boostMult          // Already accounted: retour total (mise incluse)
    : (Number(bet.odd) - 1) * stake * boostMult;  // Normal: gain net seulement
  // Lose: accounted → 0 (mise déjà dans solde départ), FB → 0, normal → -stake
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

  // Smooth bezier path
  const pathD = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cp1x = px + (x - px) * 0.5;
    const cp2x = x - (x - px) * 0.5;
    return `${acc} C${cp1x},${py} ${cp2x},${y} ${x},${y}`;
  }, "");

  const areaD = `${pathD} L${pts[pts.length-1][0]},${padTop + chartH} L${pts[0][0]},${padTop + chartH} Z`;

  // Y axis labels (4 lines)
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const t = i / gridCount;
    const v = min + range * t;
    return { y: padTop + chartH * (1 - t), v };
  });

  // Last value
  const [lx, ly] = pts[pts.length - 1];
  const lastVal = data[data.length - 1][valueKey];
  const isPositive = colorKey ? data[data.length - 1][colorKey] >= 0 : true;
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

      {/* Grid lines + Y labels */}
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

      {/* Zero line if applicable */}
      {min < 0 && max > 0 && (
        <line x1={padLeft} y1={toY(0)} x2={W - padRight} y2={toY(0)}
          stroke="#ffffff18" strokeWidth="1" strokeDasharray="3,3" />
      )}

      {/* Area fill */}
      <path d={areaD} fill="url(#lg-chart)" />

      {/* Main line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)" />

      {/* Last point */}
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

// ── DOWNLOAD TEMPLATE ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  script.onload = () => {
    const XLSX = window.XLSX;
    const rows = [
      {
        Date: "2026-06-12", Sport: "Tennis", League: "ATP", "Sub-cat": "ML",
        Bet: "Djokovic vs Alcaraz ML", Odd: 2.10, "Stake (€)": 60, "Stake (u)": 1.00,
        Result: "Win", Book: "PS3838", Freebet: "No", "Already Accounted": "No", Note: ""
      },
      {
        Date: "2026-06-12", Sport: "Baseball", League: "MLB", "Sub-cat": "Player Props",
        Bet: "Yankees vs Red Sox - Judge HR", Odd: 4.50, "Stake (€)": 15, "Stake (u)": 0.25,
        Result: "Lose", Book: "Betclic", Freebet: "No", "Already Accounted": "No", Note: "Example note"
      },
      {
        Date: "2026-06-12", Sport: "Soccer", League: "BPL", "Sub-cat": "AH",
        Bet: "Arsenal vs Chelsea AH -0.5", Odd: 1.95, "Stake (€)": 60, "Stake (u)": 1.00,
        Result: "Pending", Book: "Unibet", Freebet: "Yes", "Already Accounted": "Yes", Note: "Outright long terme"
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws["!cols"] = [10,12,15,14,40,8,12,12,10,10,10,18,10].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bets Template");
    XLSX.writeFile(wb, "bet-tracker-template.xlsx");
  };
  document.head.appendChild(script);
};

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
const parseCSVLine = (line, sep = ",") => {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === sep && !inQuote) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
};

const detectSeparator = (text) => {
  const firstLines = text.split(/\r?\n/).slice(0, 3).join("\n");
  const semis = (firstLines.match(/;/g) || []).length;
  const commas = (firstLines.match(/,/g) || []).length;
  return semis > commas ? ";" : ",";
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
  const sep = detectSeparator(text);
  const allLines = text.trim().split(/\r?\n/);
  // Skip lines before the actual header (e.g. "Tableau 1")
  const headerIdx = allLines.findIndex(l => {
    const lower = l.toLowerCase();
    return lower.includes("date") && (lower.includes("sport") || lower.includes("bet"));
  });
  const lines = headerIdx >= 0 ? allLines.slice(headerIdx) : allLines;
  const headers = parseCSVLine(lines[0], sep).map((h) => h.replace(/"/g, "").toLowerCase().trim());

  const resultMap = { win: "Win", lose: "Lose", void: "Void", "": "", pending: "Pending" };
  const sportMap = { tennis: "Tennis", baseball: "Baseball", mlb: "Baseball", football: "Soccer", soccer: "Soccer", mls: "Soccer", "us football": "US Football", nfl: "US Football", basketball: "Basketball", nba: "Basketball", wnba: "Basketball", esport: "eSport", "e-sport": "eSport", "mixed sports": "Mixed Sports", mixed: "Mixed Sports", f1: "F1", cycling: "Cycling", hockey: "Hockey", nhl: "Hockey", mma: "MMA", ufc: "MMA" };

  return lines.slice(1).map((line) => {
    if (!line.trim()) return null;
    const vals = parseCSVLine(line, sep);
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });

    const rawSport = (row.sport ?? "").toLowerCase();
    const sport = sportMap[rawSport] ?? row.sport ?? "Tennis";
    const rawResult = (row.result ?? "").toLowerCase();
    const result = resultMap[rawResult] ?? (row.result || "");

    // Parse num — handle comma decimal separator and quoted values
    const parseNum = (v) => v ? parseFloat(String(v).replace(",", ".")) : 0;
    // Get value trying multiple key variants
    const g = (...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== "") return row[k];
        // try without spaces
        const k2 = k.replace(/ /g, "");
        if (row[k2] !== undefined && row[k2] !== "") return row[k2];
      }
      return "";
    };

    return {
      id: Date.now() + Math.random(),
      date: parseDate(row.date ?? row.date),
      sport,
      league: g("league", "category") || "",
      subCat: g("sub-cat", "subcat", "subcategory", "type", "sub cat") || "",
      bet: g("bet") || "",
      odd: parseNum(g("odd", "odds")) || 1,
      stakeE: parseNum(g("stake (€)", "stake(€)", "stakee", "stake (e)", "stake(e)", "stake")) || 0,
      stakeU: parseNum(g("stake (u)", "stake(u)", "stakeu", "stake(u)")) || 0,
      result: result || "",
      note: g("note") || "",
      isFreebet: ["yes", "oui", "true", "1"].includes((g("freebet", "is_freebet", "freebets") || "").toLowerCase()),
      alreadyAccounted: ["yes", "oui", "true", "1"].includes((g("already accounted", "already_accounted", "alreadyaccounted", "accounted") || "").toLowerCase()),
      book: g("book", "bookmaker", "Book", "Bookmaker") || "",
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
        Book: b.book ?? "",
        Freebet: (b.isFreebet || b.is_freebet) ? "Yes" : "No",
        "Already Accounted": (b.alreadyAccounted || b.already_accounted) ? "Yes" : "No",
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
  const [bankroll, setBankrollState] = useState({});
  const [bookConfig, setBookConfigState] = useState({}); // { PS3838: { start: 1000, movements: [{date, type, amount, note}] } }
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState(monthKey(today()));
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [batchForms, setBatchForms] = useState([emptyBetForm()]);

  const updateBets = (next) => { setBets(next); };
  const updateBankroll = async (next) => {
    setBankrollState(next);
    save("bankroll_v2", next); // keep local backup
    await supabase.from("settings").upsert({ key: "bankroll", value: JSON.stringify(next) }, { onConflict: "key" });
  };

  // ── Supabase: load bets on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // Load bets
      const { data: betsData, error: betsError } = await supabase.from("bets").select("*").order("date", { ascending: false });
      if (betsData) setBets(betsData.map(b => ({
        ...b,
        subCat: b.subcat ?? "",
        stakeE: Number(b.stakee ?? 0),
        stakeU: Number(b.stakeu ?? 0),
        isFreebet: b.is_freebet ?? false,
        alreadyAccounted: b.already_accounted ?? false,
        comboBooster: Number(b.combo_booster ?? 0),
        book: b.book ?? "",
      })));
      if (betsError) console.error("Bets load error:", betsError);
      // Load bankroll from Supabase settings table
      const { data: settingsData } = await supabase.from("settings").select("value").eq("key", "bankroll").single();
      if (settingsData?.value) {
        try { setBankrollState(JSON.parse(settingsData.value)); } catch {}
      } else {
        const local = load("bankroll_v2", {});
        if (Object.keys(local).length > 0) setBankrollState(local);
      }
      // Load book config
      const { data: bookData } = await supabase.from("settings").select("value").eq("key", "bookConfig").single();
      if (bookData?.value) {
        try { setBookConfigState(JSON.parse(bookData.value)); } catch {}
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // unit value from global bankroll config
  const unitValue = bankroll.global?.unitValue ?? null;

  const handleSaveAll = async () => {
    if (saving) return;
    const valid = batchForms.filter(f => f.bet && f.odd);
    if (!valid.length) return;
    setSaving(true);
    if (editId !== null) {
      const f = valid[0];
      const stakeU = unitValue ? (Number(f.stakeE) / unitValue).toFixed(3) : f.stakeU;
      const entry = { date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "", bet: f.bet, odd: Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0), stakeu: Number(stakeU), result: f.result || "Pending", note: f.note ?? "", is_freebet: f.isFreebet ?? false, combo_booster: Number(f.comboBooster ?? 0), book: f.book ?? "", already_accounted: f.alreadyAccounted ?? false };
      const { error } = await supabase.from("bets").update(entry).eq("id", editId);
      if (!error) setBets(bets.map((b) => (b.id === editId ? { ...entry, id: editId } : b)));
      else alert("Error saving: " + error.message);
      setEditId(null);
    } else {
      const newEntries = valid.map((f, i) => {
        const stakeU = unitValue ? (Number(f.stakeE ?? f.stakee) / unitValue).toFixed(3) : (f.stakeU ?? f.stakeu ?? 1);
        return { date: f.date, sport: f.sport, league: f.league ?? "", subcat: f.subCat ?? f.subcat ?? "", bet: f.bet, odd: Number(f.odd), stakee: Number(f.stakeE ?? f.stakee ?? 0), stakeu: Number(stakeU), result: f.result || "Pending", note: f.note ?? "", is_freebet: f.isFreebet ?? false, combo_booster: Number(f.comboBooster ?? 0), already_accounted: f.alreadyAccounted ?? false, book: f.book ?? "" };
      });
      const { data, error } = await supabase.from("bets").insert(newEntries).select();
      if (data) setBets([...data.map(b => ({ ...b, subCat: b.subcat ?? "", stakeE: Number(b.stakee ?? 0), stakeU: Number(b.stakeu ?? 0), isFreebet: b.is_freebet ?? false, alreadyAccounted: b.already_accounted ?? false, book: b.book ?? "" })), ...bets]);
      else alert("Error saving: " + error.message);
    }
    setBatchForms([emptyBetForm()]);
    const targetDate = valid[0]?.date ?? today();
    setScrollToDate(targetDate);
    setTab("list");
    setSaving(false);
  };

  const updateBookConfig = async (next) => {
    setBookConfigState(next);
    await supabase.from("settings").upsert({ key: "bookConfig", value: JSON.stringify(next) }, { onConflict: "key" });
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
      isFreebet: bet.isFreebet ?? bet.is_freebet ?? false,
      alreadyAccounted: bet.alreadyAccounted ?? bet.already_accounted ?? false,
      comboBooster: Number(bet.comboBooster ?? bet.combo_booster ?? 0) || "",
      book: bet.book ?? "",
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
      let k;
      if (key === "league") k = b.league || b.sport || "–";
      else if (key === "subCat") k = b.subCat || b.subcat || "–";
      else if (key === "book") k = b.book || "Unknown";
      else k = b[key] || "–";
      if (!map[k]) map[k] = { bets: [], wins: 0, profitE: 0, profitU: 0, totalInvE: 0, totalInvU: 0, oddsSum: 0, oddsCount: 0 };
      const s = map[k];
      s.bets.push(b);
      if (b.result === "Win") { s.wins++; s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose") { s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      if (b.result !== "Void") {
        const isFB = b.isFreebet ?? b.is_freebet ?? false;
        const isAcc = b.alreadyAccounted ?? b.already_accounted ?? false;
        // totalInvE = cash invested only (exclude FB and already-accounted)
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

  const byBook = useMemo(() => {
    const map = groupStats(filtered, "book");
    delete map["–"];
    return map;
  }, [filtered]);

  const total = useMemo(() => {
    let wins = 0, settled = 0, profitE = 0, profitU = 0, totalInvE = 0, totalInvU = 0, oddsSum = 0, oddsCount = 0;
    filtered.forEach((b) => {
      if (b.result !== "Void" && b.result !== "Pending") settled++;
      if (b.result === "Win") { wins++; profitE += calcProfit(b, "E"); profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose") { profitE += calcProfit(b, "E"); profitU += calcProfit(b, "U"); }
      if (b.result !== "Void") {
        const isFBt = b.isFreebet ?? b.is_freebet ?? false;
        const isAcct = b.alreadyAccounted ?? b.already_accounted ?? false;
        if (!isFBt && !isAcct) totalInvE += Number(b.stakeE ?? b.stakee ?? 0);
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

  const bkChartData = useMemo(() => {
    const globalBk = bankroll.global ?? {};
    if (!globalBk.initialBalance || !globalBk.initialDate) return [];
    const movements = bankroll.movements ?? [];
    const initial = globalBk.initialBalance;
    const initialDate = globalBk.initialDate;

    // Build one point per month-end from initialDate onwards
    const points = [{ label: monthLabel(monthKey(initialDate)) + " (start)", bk: initial, profit: 0, mk: monthKey(initialDate) }];

    allMonths.filter(mk => mk >= monthKey(initialDate)).forEach(mk => {
      const [y, mo] = mk.split("-").map(Number);
      const lastDay = new Date(y, mo, 0).getDate();
      const endDate = `${mk}-${String(lastDay).padStart(2, "0")}`;
      const profitUpTo = bets
        .filter(b => b.date >= initialDate && b.date <= endDate)
        .reduce((a, b) => a + calcProfit(b, "E"), 0);
      const movsUpTo = movements
        .filter(m => m.date >= initialDate && m.date <= endDate)
        .reduce((a, m) => a + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)), 0);
      const bk = initial + profitUpTo + movsUpTo;
      const monthProfit = bets.filter(b => monthKey(b.date) === mk).reduce((a, b) => a + calcProfit(b, "E"), 0);
      points.push({ label: monthLabel(mk), bk, profit: monthProfit, mk });
    });

    return points;
  }, [allMonths, bets, bankroll]);

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
    const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const doImport = async (imported) => {
      if (!imported.length) { alert("No valid bets found in file"); return; }
      const toInsert = imported.map(({ id, ...rest }) => ({
        date: rest.date, sport: rest.sport, league: rest.league ?? "",
        subcat: rest.subCat ?? rest.subcat ?? "", bet: rest.bet, odd: Number(rest.odd),
        stakee: Number(rest.stakeE ?? rest.stakee), stakeu: Number(rest.stakeU ?? rest.stakeu),
        result: rest.result || "", note: rest.note ?? "",
        is_freebet: rest.isFreebet ?? false,
        already_accounted: rest.alreadyAccounted ?? false,
        book: rest.book ?? "",
        combo_booster: Number(rest.comboBooster ?? rest.combo_booster ?? 0),
      }));
      const { data, error } = await supabase.from("bets").insert(toInsert).select();
      if (data) {
        setBets([...data.map(b => ({
          ...b,
          subCat: b.subcat ?? "",
          stakeE: Number(b.stakee ?? 0),
          stakeU: Number(b.stakeu ?? 0),
          isFreebet: b.is_freebet ?? false,
          alreadyAccounted: b.already_accounted ?? false,
          book: b.book ?? "",
          comboBooster: Number(b.combo_booster ?? 0),
        })), ...bets]);
        alert(`✅ ${data.length} bets imported!`);
      } else alert("Import error: " + error.message);
    };

    if (isXLSX) {
      // Load SheetJS for XLSX parsing
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const XLSX = window.XLSX;
          const wb = XLSX.read(ev.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_csv(ws);
          const imported = parseCSV(rows);
          await doImport(imported);
        };
        reader.readAsArrayBuffer(file);
      };
      document.head.appendChild(script);
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const imported = parseCSV(ev.target.result);
        await doImport(imported);
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const windowWidth = useWindowWidth();
  const isDesktop = windowWidth >= 900;

  if (loading) return (
    <div style={{ height: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.accent, fontFamily: "sans-serif", gap: 16 }}>
      <div style={{ fontSize: 32 }}>🎯</div>
      <div style={{ fontSize: 14, color: T.text2 }}>Loading your bets...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', 'SF Pro Display', 'Helvetica Neue', sans-serif", paddingBottom: isDesktop ? 0 : 80 }}>

      {/* HEADER */}
      <div style={{ background: T.card, padding: isDesktop ? "16px 32px 12px" : "14px 16px 10px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: isDesktop ? 1400 : "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 4, color: T.accent, textTransform: "uppercase", fontWeight: 600 }}>JojoH</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>
                {filterMonth === "all" ? "All Time" : monthLabel(filterMonth)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
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
                  isDesktop={true} saving={saving} />
              </div>
            </div>
          </div>
          {/* Right column: tabs */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[["list","Bets"], ["stats","Stats"]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: tab === k ? T.accentDim : "transparent",
                  border: `1px solid ${tab === k ? T.accent : T.border}`,
                  borderRadius: 8, padding: "8px 20px",
                  cursor: "pointer", fontSize: 13, fontWeight: 700,
                  color: tab === k ? T.accent : T.text3,
                  transition: "all .15s", letterSpacing: 0.3,
                }}>{l}</button>
              ))}
            </div>
            {tab !== "add" && (
              <div>
                {tab === "list" && <ListTab bets={filtered} onEdit={startEdit} onDelete={setDeleteConfirm} onUpdateResult={handleUpdateResult} onExport={() => exportXLSX(bets)} onImport={handleCSVImport} filterMonth={filterMonth} scrollToDate={scrollToDate} onScrollDone={() => setScrollToDate(null)} onDeleteAll={() => { if (filterMonth === "all") { supabase.from("bets").delete().neq("id","00000000-0000-0000-0000-000000000000").then(() => setBets([])); } else { const ids = bets.filter(b => monthKey(b.date) === filterMonth).map(b => b.id); supabase.from("bets").delete().in("id", ids).then(() => setBets(bets.filter(b => monthKey(b.date) !== filterMonth))); }}} />}
                {tab === "stats" && <StatsTab total={total} bySport={bySport} byLeague={byLeague} maxProfitAbs={maxProfitAbs} bkChartData={bkChartData} bankroll={bankroll} updateBankroll={updateBankroll} allMonths={allMonths} statsTab={statsTab} setStatsTab={setStatsTab} bets={bets} dailyChartData={dailyChartData} oddsRanges={oddsRanges} filterMonth={filterMonth} bySubCat={bySubCat} byBook={byBook} bookConfig={bookConfig} updateBookConfig={updateBookConfig} />}
              </div>
            )}
            {tab === "add" && <div style={{ color: T.text3, textAlign: "center", padding: 40 }}>Filling form on the left →</div>}
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 14px 0" }}>
          {tab === "add" && (
            <AddTab batchForms={batchForms} setBatchForms={setBatchForms}
              handleSaveAll={handleSaveAll} editId={editId} setEditId={setEditId}
              setTab={setTab} emptyForm={emptyBetForm()} unitValue={unitValue}
              saving={saving} />
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
              filterMonth={filterMonth} bySubCat={bySubCat} byBook={byBook} bookConfig={bookConfig} updateBookConfig={updateBookConfig} />
          )}
        </div>
      )}

      {!isDesktop && (
        <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 500, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 24px", zIndex: 20, backdropFilter: "blur(12px)" }}>
          {[
            { key: "add", label: editId ? "Edit" : "Add", icon: <Icons.Plus /> },
            { key: "list", label: "Bets", icon: <Icons.List /> },
            { key: "stats", label: "Stats", icon: <Icons.Chart /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === key ? T.accent : T.text3, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", transition: "color .15s" }}>
              {icon}{label}
            </button>
          ))}
        </nav>
      )}

      {/* DELETE MODAL */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 24, margin: 20, border: `1px solid ${T.border}`, maxWidth: 320, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete this bet?</div>
            <div style={{ color: T.text2, fontSize: 14, marginBottom: 20 }}>This action cannot be undone.</div>
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
  isFreebet: false,
  alreadyAccounted: false,
  comboBooster: "",
  book: base.book ?? "PS3838",
});

function BetForm({ index, form, onChange, onRemove, unitValue, canRemove }) {
  const cfg = SPORTS_CONFIG[form.sport] ?? { leagues: [], subCats: [] };
  const hasLeague = cfg.leagues.length > 0;
  const hasSubCat = cfg.subCats.length > 0;
  const rawStakeE = Number(form.stakeE ?? form.stakee ?? 0);
  const rawU = unitValue && rawStakeE > 0 ? (rawStakeE / unitValue) : null;
  const computedU = rawU !== null && !isNaN(rawU) ? rawU.toFixed(3) : null;
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
    <div style={{ background: T.card, borderRadius: 10, padding: "12px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1.5 }}>Bet {index + 1}</div>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", color: T.lose, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}>×</button>
        )}
      </div>

      {/* Date */}
      <Input label="Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />

      {/* Sport */}
      <div>
        <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Sport</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(SPORTS_CONFIG).map((s) => <Chip key={s} label={s} active={form.sport === s} onClick={() => set("sport", s)} />)}
        </div>
      </div>

      {/* League */}
      {hasLeague && (
        <div>
          <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>League</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cfg.leagues.map((l) => <Chip key={l} label={l} active={form.league === l} onClick={() => set("league", l)} />)}
          </div>
        </div>
      )}

      {/* SubCat */}
      {hasSubCat && (
        <div>
          <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Type</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cfg.subCats.map((s) => <Chip key={s} label={s} active={form.subCat === s} onClick={() => set("subCat", s)} />)}
          </div>
        </div>
      )}

      {/* Book */}
      <div>
        <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Book <span style={{ color: T.lose, fontSize: 8 }}>*</span></div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {BOOKS.map((b) => <Chip key={b} label={b} active={form.book === b} onClick={() => set("book", b)} />)}
        </div>
      </div>

      {/* Bet description */}
      <Input placeholder="e.g. Djokovic vs Alcaraz ML" value={form.bet} onChange={(e) => set("bet", e.target.value)} />

      {/* Odd + Stakes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Input label="Odd" type="number" step="0.001" placeholder="2.100" value={form.odd} onChange={(e) => set("odd", e.target.value)} />
        <Input label="Stake €" type="number" value={form.stakeE} onChange={(e) => set("stakeE", e.target.value)} />
        <div>
          <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Stake u</div>
          {computedU
            ? <div style={{ background: T.card2, border: `1px solid ${T.accent}30`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: T.accent, fontWeight: 700 }}>{computedU}u</div>
            : <input type="number" step="0.001" value={manualU} onChange={(e) => set("stakeU", e.target.value)}
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }} />
          }
        </div>
      </div>

      {/* Combo Booster - only for Parlay */}
      {form.subCat === "Parlay" && (
        <div>
          <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Combo Booster % <span style={{ color: T.text3, fontSize: 9, textTransform: "none" }}>(optionnel)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number" step="0.1" min="0" max="100"
              placeholder="0.5"
              value={form.comboBooster}
              onChange={(e) => set("comboBooster", e.target.value)}
              style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }}
            />
            <div style={{ fontSize: 11, color: T.text3, whiteSpace: "nowrap" }}>
              {form.comboBooster > 0 ? `+${((Number(form.odd) - 1) * Number(form.stakeE || 0) * Number(form.comboBooster) / 100).toFixed(2)}€ bonus` : "% bonus"}
            </div>
          </div>
        </div>
      )}

      {/* Freebet toggle */}
      <button
        onClick={() => set("isFreebet", !form.isFreebet)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: form.isFreebet ? "#7c3aed18" : T.card2,
          border: `1px solid ${form.isFreebet ? "#7c3aed60" : T.border}`,
          borderRadius: 8, padding: "8px 12px", cursor: "pointer", width: "100%",
          transition: "all .2s",
        }}
      >
        <div style={{
          width: 32, height: 18, borderRadius: 9,
          background: form.isFreebet ? "#7c3aed" : T.border2,
          position: "relative", transition: "background .2s", flexShrink: 0,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 2,
            left: form.isFreebet ? 16 : 2,
            transition: "left .2s",
          }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: form.isFreebet ? "#7c3aed" : T.text2, letterSpacing: 0.3 }}>
            {form.isFreebet ? "Freebet" : "Cash"}
          </span>
          {form.isFreebet && (
            <span style={{ fontSize: 9, color: "#7c3aed88", letterSpacing: 0.2 }}>Win = (cote−1)×mise · Lose = 0</span>
          )}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: form.isFreebet ? "#7c3aed" : T.text3, fontWeight: 600 }}>
          {form.isFreebet ? "FB" : "CASH"}
        </div>
      </button>

      {/* Already Accounted toggle */}
      <button
        onClick={() => set("alreadyAccounted", !form.alreadyAccounted)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: form.alreadyAccounted ? "#f0a50012" : T.card2,
          border: `1px solid ${form.alreadyAccounted ? "#f0a50060" : T.border}`,
          borderRadius: 8, padding: "8px 12px", cursor: "pointer", width: "100%",
          transition: "all .2s",
        }}
      >
        {/* Diamond checkbox */}
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          border: `2px solid ${form.alreadyAccounted ? "#f0a500" : T.border2}`,
          background: form.alreadyAccounted ? "#f0a500" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all .2s",
          transform: "rotate(45deg)",
        }}>
          {form.alreadyAccounted && (
            <div style={{ width: 6, height: 6, background: T.bg, borderRadius: 1 }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: form.alreadyAccounted ? "#f0a500" : T.text2, letterSpacing: 0.3 }}>
            Already accounted
          </span>
          {form.alreadyAccounted && (
            <span style={{ fontSize: 9, color: "#f0a50088", letterSpacing: 0.2 }}>Lose = 0 impact · Win = gain normal</span>
          )}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: form.alreadyAccounted ? "#f0a500" : T.text3, fontWeight: 700, letterSpacing: 0.5 }}>
          {form.alreadyAccounted ? "ON" : "OFF"}
        </div>
      </button>

      {/* Result */}
      <div>
        <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Result</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RESULTS.map((r) => <Chip key={r} label={r} active={form.result === r} onClick={() => set("result", r)} color={RESULT_COLORS[r]} />)}
        </div>
      </div>

      {/* Note */}
      <Input label="Note (optional)" placeholder="Analysis, context..." value={form.note} onChange={(e) => set("note", e.target.value)} />
    </div>
  );
}

function AddTab({ batchForms, setBatchForms, handleSaveAll, editId, setEditId, setTab, emptyForm, unitValue, isDesktop, saving }) {
  const addForm = () => {
    const last = batchForms[batchForms.length - 1];
    setBatchForms([...batchForms, emptyBetForm({ date: last.date, sport: last.sport, league: last.league, subCat: last.subCat, stakeE: last.stakeE, stakeU: last.stakeU })]);
  };
  const updateForm = (i, val) => setBatchForms(batchForms.map((f, idx) => idx === i ? val : f));
  const removeForm = (i) => setBatchForms(batchForms.filter((_, idx) => idx !== i));

  const validCount = batchForms.filter(f => f.bet && f.odd).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: "uppercase", letterSpacing: 2 }}>
          {editId ? "Edit Bet" : `New Bet${batchForms.length > 1 ? "s (" + batchForms.length + ")" : ""}`}
        </div>
        {editId && <button onClick={() => { setEditId(null); setBatchForms([emptyBetForm()]); setTab("list"); }} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer", fontSize: 12 }}>Cancel</button>}
      </div>

      {batchForms.map((f, i) => (
        <BetForm key={i} index={i} form={f} onChange={(val) => updateForm(i, val)}
          onRemove={() => removeForm(i)} unitValue={unitValue} canRemove={batchForms.length > 1} />
      ))}

      {!editId && (
        <button onClick={addForm} style={{ background: T.card2, border: "1px dashed #334155", borderRadius: 12, padding: "12px", color: T.accent, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Add another bet
        </button>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8, position: isDesktop ? "relative" : "sticky", bottom: isDesktop ? "auto" : 90 }}>
        {editId && (
          <button onClick={() => { setEditId(null); setBatchForms([emptyBetForm()]); setTab("list"); }}
            style={{ flex: 1, background: "transparent", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px", color: T.text2, fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
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
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", marginBottom: open ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: T.text2, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{dateLabel}</span>
          <span style={{ fontSize: 10, color: T.text3, background: T.card2, borderRadius: 10, padding: "1px 6px", border: `1px solid ${T.border}` }}>{bets.length}</span>
          <span style={{ fontSize: 10, color: T.text3 }}>{open ? "▾" : "▸"}</span>
        </div>
        {hasSettled && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: profitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>{fmt(profitE)}€</span>
            <span style={{ fontSize: 10, color: profitU >= 0 ? T.win + "88" : T.lose + "88", fontVariantNumeric: "tabular-nums" }}>{fmt(profitU)}u</span>
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
  const isCurrentWeek = weekLabel === currentWeek;
  const [open, setOpen] = useState(defaultOpen ?? isCurrentWeek);
  const profitE = bets.reduce((a, b) => a + calcProfit(b, "E"), 0);
  const profitU = bets.reduce((a, b) => a + calcProfit(b, "U"), 0);
  const settled = bets.filter(b => b.result !== "Pending" && b.result !== "Void");
  const hasSettled = settled.length > 0;

  return (
    <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>{weekLabel}</span>
          <span style={{ fontSize: 10, color: T.text3, background: T.card2, borderRadius: 10, padding: "1px 7px", border: `1px solid ${T.border}` }}>{bets.length}</span>
          <span style={{ fontSize: 10, color: T.text3 }}>{open ? "▾" : "▸"}</span>
        </div>
        {hasSettled && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: profitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>{fmt(profitE)}€</span>
            <span style={{ fontSize: 10, color: profitU >= 0 ? T.win + "88" : T.lose + "88", fontVariantNumeric: "tabular-nums" }}>{fmt(profitU)}u</span>
          </div>
        )}
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
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
  const [bookFilter, setBookFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (scrollToDate) {
      setTimeout(() => {
        const el = document.getElementById(`day-${scrollToDate}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        onScrollDone?.();
      }, 100);
    }
  }, [scrollToDate]);

  const sports = ["All", ...Object.keys(SPORTS_CONFIG)];
  const statuses = ["All", "Pending", "Win", "Lose", "Void"];
  const filtered = bets
    .filter(b => sportFilter === "All" || b.sport === sportFilter)
    .filter(b => bookFilter === "All" || (b.book || "Unknown") === bookFilter)
    .filter(b => statusFilter === "All" || b.result === statusFilter)
    .filter(b => !search || b.bet?.toLowerCase().includes(search.toLowerCase()) || b.league?.toLowerCase().includes(search.toLowerCase()) || (b.subCat ?? b.subcat ?? '').toLowerCase().includes(search.toLowerCase()));
  
  const sorted = [...filtered].sort((a, b) => {
    // 1. Date desc
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;

    // 2. Sort by sport if sortBy === "sport"
    if (sortBy === "sport") {
      return a.sport.localeCompare(b.sport);
    }

    // 3. Pending first, grouped by sport
    const aPending = a.result === "Pending";
    const bPending = b.result === "Pending";
    if (aPending !== bPending) return aPending ? -1 : 1;

    // 4. Within Pending: sort by sport
    if (aPending && bPending) {
      const sportCmp = a.sport.localeCompare(b.sport);
      if (sportCmp !== 0) return sportCmp;
    }

    // 5. Within settled: newest first
    const caA = a.created_at ?? "";
    const caB = b.created_at ?? "";
    return caB.localeCompare(caA); // descending = newest first within the day
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
      <div style={{ display: "flex", gap: 6 }}>
        <label style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px", color: T.text2, fontSize: 12, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Icons.Upload /> Import
          <input type="file" accept=".xlsx,.csv" onChange={onImport} style={{ display: "none" }} />
        </label>
        <button onClick={onExport} style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px", color: T.text2, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Icons.Download /> Export
        </button>
        <button onClick={downloadTemplate} style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px", color: T.accent, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          📋 Template
        </button>
        <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? T.accentDim : T.card, border: `1px solid ${showFilters ? T.accent : T.border}`, borderRadius: 8, padding: "9px 11px", color: showFilters ? T.accent : T.text2, fontSize: 13, cursor: "pointer", position: "relative" }}>
          ⚙︎
          {(sportFilter !== "All" || statusFilter !== "All" || bookFilter !== "All") && (
            <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: T.accent, display: "block" }} />
          )}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <input
          placeholder="🔍  Search bets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.text2, cursor: "pointer", fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ background: T.card, borderRadius: 12, padding: "12px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Filter by sport</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sports.map(s => <Chip key={s} label={s} active={sportFilter === s} onClick={() => setSportFilter(s)} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Filter by status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statuses.map(s => (
                <Chip key={s} label={s} active={statusFilter === s}
                  color={s !== "All" ? RESULT_COLORS[s] : undefined}
                  onClick={() => setStatusFilter(s)} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Filter by book</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["All", ...BOOKS].map(b => <Chip key={b} label={b} active={bookFilter === b} onClick={() => setBookFilter(b)} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Sort by</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Chip label="📅 Date" active={sortBy === "date"} onClick={() => setSortBy("date")} />
              <Chip label="🏅 Sport" active={sortBy === "sport"} onClick={() => setSortBy("sport")} />
            </div>
          </div>
        </div>
      )}

      {/* Delete all */}
      {showDeleteAll ? (
        <div style={{ background: T.card2, border: "1px solid #ef4444", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Delete {filterMonth === "all" ? "all" : "this month's"} bets?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteAll(false)} style={{ flex: 1, background: T.border2, border: "none", borderRadius: 10, padding: "10px", color: T.text, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onDeleteAll(); setShowDeleteAll(false); }} style={{ flex: 1, background: T.lose, border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Yes, delete</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowDeleteAll(true)} style={{ background: "none", border: "1px solid #ef444433", borderRadius: 10, padding: "8px", color: T.lose, fontSize: 12, cursor: "pointer", width: "100%" }}>
          🗑 Delete {filterMonth === "all" ? "all" : "this month's"} bets
        </button>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", color: T.text3, padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div>No bets for this period</div>
        </div>
      )}

      {/* Weeks — with month separators when showing all time */}
      {(() => {
        let currentMonth = null;
        const elements = [];
        
        weekEntries.forEach(([wk, { bets: wBets, dates }]) => {
          // Determine month of this week (use first date)
          const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));
          const weekMonth = monthKey(sortedDates[0]);
          
          // Add month separator when month changes (only in "all" view or when multiple months)
          if (weekMonth !== currentMonth) {
            if (currentMonth !== null || filterMonth === "all") {
              // Calculate month profit
              const monthBets = sorted.filter(b => monthKey(b.date) === weekMonth);
              const monthProfitE = monthBets.reduce((a, b) => a + calcProfit(b, "E"), 0);
              const monthProfitU = monthBets.reduce((a, b) => a + calcProfit(b, "U"), 0);
              const hasSettled = monthBets.some(b => b.result !== "Pending" && b.result !== "Void");
              
              elements.push(
                <div key={`month-${weekMonth}`} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  margin: "8px 0 6px", 
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.accent, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {monthLabel(weekMonth)}
                  </div>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  {hasSettled && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: monthProfitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>
                        {fmt(monthProfitE)}€
                      </span>
                      <span style={{ fontSize: 10, color: monthProfitU >= 0 ? T.win + "88" : T.lose + "88", fontVariantNumeric: "tabular-nums" }}>
                        {fmt(monthProfitU)}u
                      </span>
                    </div>
                  )}
                </div>
              );
            }
            currentMonth = weekMonth;
          }
          
          elements.push(
            <WeekGroup key={wk} weekLabel={weekLabel(wk)} days={sortedDates} bets={wBets} onEdit={onEdit} onDelete={onDelete} onUpdateResult={onUpdateResult} />
          );
        });
        
        return elements;
      })()}
    </div>
  );
}

function BetCard({ bet, onEdit, onDelete, onUpdateResult }) {
  const profitE = calcProfit(bet, "E");
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{
      background: T.card, borderRadius: 10,
      borderLeft: `3px solid ${RESULT_COLORS[bet.result]}`,
      border: `1px solid ${T.border}`,
      padding: "11px 12px",
      transition: "border-color .2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 5, flexWrap: "wrap", alignItems: "center" }}>
            <Tag>{bet.sport}</Tag>
            {bet.league && <Tag>{bet.league}</Tag>}
            {(bet.subCat || bet.subcat) && <Tag>{bet.subCat || bet.subcat}</Tag>}
            <Tag color={RESULT_COLORS[bet.result]}>{bet.result}</Tag>
            {bet.book && <Tag color={T.text3}>{bet.book}</Tag>}
            {(bet.isFreebet || bet.is_freebet) && <Tag color="#7c3aed">FB</Tag>}
            {(bet.alreadyAccounted || bet.already_accounted) && <Tag color="#f0a500">◈ Accounted</Tag>}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4, color: T.text, overflow: "hidden", textOverflow: "ellipsis" }}>{bet.bet}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.text3, background: T.card2, borderRadius: 4, padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>@{Number(bet.odd ?? 0).toFixed(3)}</span>
            <span style={{ fontSize: 11, color: T.text2, background: T.card2, borderRadius: 4, padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>{Number(bet.stakeE ?? bet.stakee ?? 0).toFixed(2).replace(/\.?0+$/, "")}€</span>
            <span style={{ fontSize: 11, color: T.text2, background: T.card2, borderRadius: 4, padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>{Number(bet.stakeU ?? bet.stakeu ?? 0).toFixed(3)}u</span>
          </div>
          {bet.note && <div style={{ fontSize: 11, color: T.text3, marginTop: 3, fontStyle: "italic" }}>{bet.note}</div>}
          {bet.result === "Pending" && (
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {["Win", "Lose", "Void"].map(r => (
                <button key={r} onClick={() => onUpdateResult(bet, r)} style={{
                  background: RESULT_COLORS[r] + "15",
                  border: `1px solid ${RESULT_COLORS[r]}40`,
                  color: RESULT_COLORS[r],
                  borderRadius: 6, padding: "3px 10px",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                  letterSpacing: 0.5, textTransform: "uppercase",
                }}>{r}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {bet.result !== "Pending" && bet.result !== "Void" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: profitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>
                {fmt(profitE)}€
              </div>
              <div style={{ fontSize: 10, color: profitE >= 0 ? T.win + "99" : T.lose + "99", fontVariantNumeric: "tabular-nums" }}>
                {fmt(calcProfit(bet, "U"))}u
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onEdit(bet)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 6px", cursor: "pointer", color: T.text2, display: "flex" }}><Icons.Edit s={13} /></button>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: T.lose, fontWeight: 700 }}>Sure?</span>
                <button onClick={() => onDelete(bet.id)} style={{ background: T.lose + "22", border: `1px solid ${T.lose}55`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: T.lose, fontSize: 10, fontWeight: 700 }}>Yes</button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: T.text2, fontSize: 10 }}>No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 6px", cursor: "pointer", color: T.lose + "88", display: "flex" }}><Icons.Trash s={13} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════════
// BOOK TAB
// ════════════════════════════════════════════════════════════════════════════════
function BookTab({ byBook, bets, bookConfig, updateBookConfig }) {
  const [editBook, setEditBook] = useState(null);
  const [editForm, setEditForm] = useState({ start: "", date: today() });
  const [movForm, setMovForm] = useState({ type: "deposit", amount: "", date: today(), note: "" });
  const [showMovForm, setShowMovForm] = useState(null);

  const allBooks = [...new Set([...BOOKS, ...Object.keys(byBook)])].filter(b => b && b !== "Autre" || byBook[b]);

  const getRunning = (book) => {
    const cfg = bookConfig[book] ?? {};
    const profit = (byBook[book]?.profitE ?? 0);
    const movements = cfg.movements ?? [];
    const netMovements = movements.reduce((a, m) => a + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)), 0);
    return (cfg.start ?? 0) + profit + netMovements;
  };

  const saveBookConfig = (book, updates) => {
    const next = { ...bookConfig, [book]: { ...(bookConfig[book] ?? {}), ...updates } };
    updateBookConfig(next);
  };

  const addMovement = (book) => {
    if (!movForm.amount) return;
    const cfg = bookConfig[book] ?? {};
    const movements = [...(cfg.movements ?? []), { ...movForm, id: Date.now() }];
    saveBookConfig(book, { movements });
    setMovForm({ type: "deposit", amount: "", date: today(), note: "" });
    setShowMovForm(null);
  };

  const deleteMovement = (book, id) => {
    const cfg = bookConfig[book] ?? {};
    const movements = (cfg.movements ?? []).filter(m => m.id !== id);
    saveBookConfig(book, { movements });
  };

  const maxAbs = Math.max(...allBooks.map(b => Math.abs(byBook[b]?.profitE ?? 0)), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {allBooks.length === 0 && (
        <div style={{ color: T.text3, textAlign: "center", padding: 40 }}>
          Add bets with a book assigned to see stats here
        </div>
      )}

      {allBooks.map(book => {
        const s = byBook[book] ?? { bets: [], wins: 0, profitE: 0, profitU: 0, totalInvE: 0 };
        const cfg = bookConfig[book] ?? {};
        const settled = s.bets.filter(b => b.result !== "Void" && b.result !== "Pending").length;
        const wr = settled ? (s.wins / settled) * 100 : 0;
        const roi = s.totalInvE ? (s.profitE / s.totalInvE) * 100 : 0;
        const running = getRunning(book);
        const hasStart = cfg.start > 0;
        const movements = cfg.movements ?? [];

        return (
          <div key={book} style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, borderLeft: `3px solid ${bookColor(book).bg}`, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: bookColor(book).accent, letterSpacing: 0.3 }}>{book}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: s.profitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>{fmt(s.profitE)}€</span>
                <button onClick={() => { setEditBook(book); setEditForm({ start: cfg.start ?? "", date: cfg.date ?? today() }); }}
                  style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 8px", color: T.accent, fontSize: 10, cursor: "pointer" }}>
                  Setup
                </button>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "6px 10px 8px" }}>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 10, marginBottom: hasStart ? 6 : 0 }}>
                <div><div style={{ color: T.text, fontWeight: 700 }}>{s.bets.length}</div><div style={{ color: T.text3 }}>Bets</div></div>
                <div><div style={{ color: T.text, fontWeight: 700 }}>{fmtAbs(wr)}%</div><div style={{ color: T.text3 }}>Win %</div></div>
                <div><div style={{ color: roi >= 0 ? T.win : T.lose, fontWeight: 700 }}>{fmt(roi)}%</div><div style={{ color: T.text3 }}>ROI</div></div>
                <div><div style={{ color: T.text, fontWeight: 700 }}>{fmt(s.profitU)}u</div><div style={{ color: T.text3 }}>Profit u</div></div>
              </div>

              {/* Running balance */}
              {hasStart && (
                <div style={{ background: T.card2, borderRadius: 8, padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: T.text3 }}>
                    Start: <b style={{ color: T.text }}>{cfg.start}€</b>
                    {movements.length > 0 && <span style={{ marginLeft: 8 }}>Mvts: <b style={{ color: T.text }}>{movements.reduce((a,m) => a + (m.type==="deposit"?1:-1)*Number(m.amount),0) >= 0 ? "+" : ""}{movements.reduce((a,m) => a + (m.type==="deposit"?1:-1)*Number(m.amount),0).toFixed(0)}€</b></span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: running >= cfg.start ? T.win : T.lose, fontVariantNumeric: "tabular-nums" }}>
                    {running.toFixed(2)}€
                  </div>
                </div>
              )}
            </div>

            {/* Movements */}
            {hasStart && movements.length > 0 && (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px" }}>
                {movements.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 11 }}>
                    <div style={{ color: T.text3 }}>
                      <span style={{ marginRight: 6 }}>{m.type === "deposit" ? "↗" : "↘"}</span>
                      {m.date} {m.note && `· ${m.note}`}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: m.type === "deposit" ? T.win : T.lose, fontWeight: 700 }}>
                        {m.type === "deposit" ? "+" : "-"}{Number(m.amount).toFixed(2)}€
                      </span>
                      <button onClick={() => deleteMovement(book, m.id)} style={{ background: "none", border: "none", color: T.lose + "66", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add movement button */}
            {hasStart && (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 14px" }}>
                {showMovForm === book ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setMovForm(f => ({ ...f, type: "deposit" }))}
                        style={{ flex: 1, background: movForm.type === "deposit" ? T.win + "22" : T.card2, border: `1px solid ${movForm.type === "deposit" ? T.win : T.border}`, borderRadius: 6, padding: "6px", color: movForm.type === "deposit" ? T.win : T.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ↗ Dépôt
                      </button>
                      <button onClick={() => setMovForm(f => ({ ...f, type: "withdrawal" }))}
                        style={{ flex: 1, background: movForm.type === "withdrawal" ? T.lose + "22" : T.card2, border: `1px solid ${movForm.type === "withdrawal" ? T.lose : T.border}`, borderRadius: 6, padding: "6px", color: movForm.type === "withdrawal" ? T.lose : T.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ↘ Retrait
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <input type="number" placeholder="Montant €" value={movForm.amount} onChange={e => setMovForm(f => ({ ...f, amount: e.target.value }))}
                        style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                      <input type="date" value={movForm.date} onChange={e => setMovForm(f => ({ ...f, date: e.target.value }))}
                        style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <input placeholder="Note (optionnel)" value={movForm.note} onChange={e => setMovForm(f => ({ ...f, note: e.target.value }))}
                      style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box", width: "100%" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setShowMovForm(null)} style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px", color: T.text2, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                      <button onClick={() => addMovement(book)} style={{ flex: 2, background: T.accent, border: "none", borderRadius: 6, padding: "8px", color: T.bg, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ajouter</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowMovForm(book)} style={{ width: "100%", background: "transparent", border: `1px dashed ${T.border2}`, borderRadius: 6, padding: "6px", color: T.text3, fontSize: 11, cursor: "pointer" }}>
                    + Dépôt / Retrait
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Setup book modal */}
      {editBook && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 24, width: "100%", maxWidth: 340, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Setup — {editBook}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 600 }}>Solde de départ (€)</div>
              <input type="number" value={editForm.start} onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))}
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 600 }}>Date de départ</div>
              <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditBook(null)} style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px", color: T.text2, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Annuler</button>
              <button onClick={() => { saveBookConfig(editBook, { start: Number(editForm.start), date: editForm.date }); setEditBook(null); }}
                style={{ flex: 2, background: T.accent, border: "none", borderRadius: 8, padding: "11px", color: T.bg, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FREEBET WALLET CARD ───────────────────────────────────────────────────────
function FBWalletCard({ currentFBWallet, globalBk, bets, fbAdditions, addFBMovement, deleteFBMovement }) {
  const [showFBMov, setShowFBMov] = useState(false);
  const [fbMovForm, setFBMovForm] = useState({ amount: "", date: today(), note: "" });

  const hasFB = (globalBk.initialFB ?? 0) > 0 || fbAdditions.length > 0;
  if (!hasFB) return null;

  const fbUsed = bets
    .filter(b => (b.isFreebet || b.is_freebet) && b.date >= (globalBk.initialDate ?? "1970-01-01"))
    .reduce((a, b) => a + Number(b.stakeE ?? b.stakee ?? 0), 0);

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: "14px", border: "1px solid #7c3aed44" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Freebets</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: (currentFBWallet ?? 0) >= 0 ? "#7c3aed" : T.lose }}>
          {(currentFBWallet ?? 0).toFixed(2)}EUR
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, fontSize: 11 }}>
        <div style={{ background: T.card2, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ color: T.text3, marginBottom: 2 }}>Initial</div>
          <div style={{ color: "#7c3aed", fontWeight: 700 }}>{(globalBk.initialFB ?? 0).toFixed(2)}EUR</div>
        </div>
        <div style={{ background: T.card2, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ color: T.text3, marginBottom: 2 }}>Utilises</div>
          <div style={{ color: T.text2, fontWeight: 700 }}>-{fbUsed.toFixed(2)}EUR</div>
        </div>
      </div>
      {fbAdditions.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {[...fbAdditions].sort((a, b) => a.date.localeCompare(b.date)).map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 11, borderBottom: "1px solid " + T.border }}>
              <div style={{ color: T.text3 }}>{m.date}{m.note ? " - " + m.note : ""}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#7c3aed", fontWeight: 700 }}>+{Number(m.amount).toFixed(2)}EUR</span>
                <button onClick={() => deleteFBMovement(m.id)} style={{ background: "none", border: "none", color: T.lose + "66", cursor: "pointer", fontSize: 14 }}>x</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showFBMov ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4, fontWeight: 600 }}>Montant (EUR)</div>
              <input type="number" placeholder="50" value={fbMovForm.amount} onChange={e => setFBMovForm(f => ({ ...f, amount: e.target.value }))}
                style={{ width: "100%", background: T.card2, border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4, fontWeight: 600 }}>Date</div>
              <input type="date" value={fbMovForm.date} onChange={e => setFBMovForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", background: T.card2, border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <input placeholder="Note (optionnel)" value={fbMovForm.note} onChange={e => setFBMovForm(f => ({ ...f, note: e.target.value }))}
            style={{ background: T.card2, border: "1px solid " + T.border, borderRadius: 6, padding: "8px 10px", color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box", width: "100%" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowFBMov(false)}
              style={{ flex: 1, background: T.card2, border: "1px solid " + T.border, borderRadius: 6, padding: "8px", color: T.text2, fontSize: 12, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={() => { addFBMovement(fbMovForm.amount, fbMovForm.date, fbMovForm.note); setShowFBMov(false); setFBMovForm({ amount: "", date: today(), note: "" }); }}
              style={{ flex: 2, background: "#7c3aed", border: "none", borderRadius: 6, padding: "8px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Ajouter des FB
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowFBMov(true)}
          style={{ width: "100%", background: "transparent", border: "1px dashed #7c3aed55", borderRadius: 8, padding: "8px", color: "#7c3aed88", fontSize: 12, cursor: "pointer" }}>
          + Ajouter des freebets
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ════════════════════════════════════════════════════════════════════════════════
function StatsTab({ total, bySport, byLeague, bySubCat, byBook, maxProfitAbs, bkChartData, bankroll, updateBankroll, allMonths, statsTab, setStatsTab, bets, dailyChartData, oddsRanges, filterMonth, bookConfig, updateBookConfig }) {
  const [showShare, setShowShare] = useState(false);

  // ── NEW BANKROLL MODEL ────────────────────────────────────────────────────────
  // bankroll is now a single object:
  //   bankroll.global = { initialBalance: number, initialDate: string, unitValue: number }
  //   bankroll.movements = [ { id, date, type: "deposit"|"withdrawal", amount, note } ]
  // Monthly views are derived from bets + movements, no per-month start needed.
  // ─────────────────────────────────────────────────────────────────────────────

  const [showBkSetup, setShowBkSetup] = useState(false);
  const [bkSetupForm, setBkSetupForm] = useState({ initialBalance: "", initialDate: "", unitValue: "", initialFB: "" });
  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ type: "deposit", amount: "", date: today(), note: "" });

  const globalBk = bankroll.global ?? {};
  const movements = bankroll.movements ?? [];

  const openBkSetup = () => {
    setBkSetupForm({ initialBalance: globalBk.initialBalance ?? "", initialDate: globalBk.initialDate ?? "", unitValue: globalBk.unitValue ?? "", initialFB: globalBk.initialFB ?? "" });
    setShowBkSetup(true);
  };

  const saveBkSetup = () => {
    const next = { ...bankroll, global: { initialBalance: Number(bkSetupForm.initialBalance), initialDate: bkSetupForm.initialDate, unitValue: Number(bkSetupForm.unitValue), initialFB: Number(bkSetupForm.initialFB) } };
    updateBankroll(next);
    setShowBkSetup(false);
  };

  const addMovement = () => {
    if (!movForm.amount) return;
    const next = { ...bankroll, movements: [...movements, { ...movForm, id: Date.now(), amount: Number(movForm.amount) }] };
    updateBankroll(next);
    setMovForm({ type: "deposit", amount: "", date: today(), note: "" });
    setShowMovModal(false);
  };

  const deleteMovement = (id) => {
    const next = { ...bankroll, movements: movements.filter(m => m.id !== id) };
    updateBankroll(next);
  };

  // Cumulative balance up to (and including) a given date
  const balanceAtDate = (upToDate) => {
    const initial = globalBk.initialBalance ?? 0;
    const initialDate = globalBk.initialDate ?? "1970-01-01";
    const profitUpTo = bets
      .filter(b => b.date >= initialDate && b.date <= upToDate)
      .reduce((a, b) => a + calcProfit(b, "E"), 0);
    const movsUpTo = movements
      .filter(m => m.date >= initialDate && m.date <= upToDate)
      .reduce((a, m) => a + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)), 0);
    return initial + profitUpTo + movsUpTo;
  };

  // Balance at end of month
  const balanceEndOfMonth = (mk) => {
    if (!globalBk.initialBalance) return null;
    const [y, mo] = mk.split("-").map(Number);
    const lastDay = new Date(y, mo, 0).getDate();
    const endDate = `${mk}-${String(lastDay).padStart(2, "0")}`;
    return balanceAtDate(endDate);
  };

  // Current running balance
  const currentBalance = globalBk.initialBalance ? balanceAtDate(today()) : null;

  // ── FREEBET WALLET ─────────────────────────────────────────────────────────
  // FB wallet: starts at initialFB, each FB bet placed reduces it, FB top-ups add to it
  // FB wins go to main bankroll (calcProfit handles it), FB losses = 0 impact on bankroll
  const fbAdditions = (bankroll.fbMovements ?? []);

  const fbWalletAtDate = (upToDate) => {
    const initial = globalBk.initialFB ?? 0;
    const initialDate = globalBk.initialDate ?? "1970-01-01";
    // FB stakes placed (debits wallet)
    const fbUsed = bets
      .filter(b => (b.isFreebet || b.is_freebet) && b.date >= initialDate && b.date <= upToDate)
      .reduce((a, b) => a + Number(b.stakeE ?? b.stakee ?? 0), 0);
    // Manual FB top-ups
    const fbAdded = fbAdditions
      .filter(m => m.date <= upToDate)
      .reduce((a, m) => a + Number(m.amount), 0);
    return initial - fbUsed + fbAdded;
  };

  const currentFBWallet = (globalBk.initialFB ?? 0) > 0 || fbAdditions.length > 0
    ? fbWalletAtDate(today()) : null;

  const addFBMovement = (amount, date, note) => {
    const next = { ...bankroll, fbMovements: [...(bankroll.fbMovements ?? []), { id: Date.now(), amount: Number(amount), date, note }] };
    updateBankroll(next);
  };
  const deleteFBMovement = (id) => {
    const next = { ...bankroll, fbMovements: (bankroll.fbMovements ?? []).filter(m => m.id !== id) };
    updateBankroll(next);
  };

  // Profit for a given month (settled bets only)
  const monthProfit = (mk) => bets
    .filter(b => monthKey(b.date) === mk)
    .reduce((a, b) => a + calcProfit(b, "E"), 0);

  // Net movements for a given month
  const monthMovements = (mk) => movements
    .filter(m => monthKey(m.date) === mk)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Running balance (legacy compat shim — not used in new model but kept for chart)
  const runningBalance = (mk) => balanceEndOfMonth(mk);

  const renderGroup = (map, maxAbs) => Object.entries(map).map(([name, s]) => {
    const settled = s.bets.filter((b) => b.result !== "Void" && b.result !== "Pending").length;
    const wr = settled ? (s.wins / settled) * 100 : 0;
    const avgOdd = s.oddsCount ? s.oddsSum / s.oddsCount : 0;
    const avgStakeU = settled && s.totalInvU ? s.totalInvU / settled : 0;
    return (
      <div key={name} style={{ background: T.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: s.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(s.profitE)}€</div>
        </div>
        <div style={{ height: 5, background: T.card2, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.abs(s.profitE / maxAbs) * 100}%`, height: "100%", background: s.profitE >= 0 ? "#22c55e" : "#ef4444", borderRadius: 3 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11, color: T.text2 }}>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{s.bets.length}</div>Bets</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{s.wins}</div>Wins</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{fmtAbs(wr)}%</div>Win %</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{fmtAbs(s.totalInvE)}€</div>Invested</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{fmt(s.profitU)}u</div>Profit u</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{fmtAbs(avgOdd)}</div>Avg Odd</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{fmtAbs(avgStakeU)}u</div>Avg Stake</div>
          <div><div style={{ color: T.text2, fontWeight: 600 }}>{s.totalInvE ? fmt(s.profitE / s.totalInvE * 100) : "–"}%</div>ROI</div>
        </div>
      </div>
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* HERO PROFIT */}
      <div style={{ background: T.card, borderRadius: 12, padding: "16px", border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 9, color: T.text3, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Total Profit</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: total.profitE >= 0 ? T.win : T.lose, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
            {total.profitE >= 0 ? "+" : ""}{total.profitE.toFixed(2)}€
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: total.profitU >= 0 ? T.win + "bb" : T.lose + "bb" }}>
            {total.profitU >= 0 ? "+" : ""}{total.profitU.toFixed(3)}u
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: T.text3 }}>ROI <b style={{ color: total.roi >= 0 ? T.win : T.lose }}>{total.roi >= 0 ? "+" : ""}{total.roi.toFixed(1)}%</b></span>
          <span style={{ fontSize: 11, color: T.text3 }}>Win Rate <b style={{ color: total.winRate >= 50 ? T.win : T.lose }}>{total.winRate.toFixed(1)}%</b></span>
          <span style={{ fontSize: 11, color: T.text3 }}>Avg Odd <b style={{ color: T.text }}>{fmtAbs(total.avgOdd)}</b></span>
          <span style={{ fontSize: 11, color: T.text3 }}>Invested <b style={{ color: T.text }}>{fmtAbs(total.totalInvE)}€</b></span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        <KPI label="Bets" value={total.total} />
        <KPI label="Wins" value={total.wins} color={T.win} />
        <KPI label="Avg Stake" value={fmtAbs(total.avgStakeU) + "u"} />
        <KPI label="Avg Odd" value={fmtAbs(total.avgOdd)} />
      </div>

      {/* SHARE CARD */}
      <button onClick={() => setShowShare(true)} style={{ background: T.card2, border: `1px solid ${T.border2}`, borderRadius: 12, padding: "10px 14px", color: T.text2, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}>
        📊 {filterMonth === "all" ? "Share All Time Stats" : "Share Monthly Summary"}
      </button>

      {/* SUB-TABS */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 12, overflowX: "auto" }}>
        {[["bk", "Bankroll"], ["sport", "By Sport"], ["league", "By League"], ["subcat", "By Type"], ["book", "By Book"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatsTab(k)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: statsTab === k ? T.accent : T.text3, borderBottom: statsTab === k ? `2px solid ${T.accent}` : "2px solid transparent", paddingBottom: 4, whiteSpace: "nowrap" }}>{l}</button>
        ))}
      </div>

      {statsTab === "sport" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderGroup(bySport, maxProfitAbs)}
          {Object.keys(bySport).length === 0 && <div style={{ color: T.text3, textAlign: "center", padding: 20 }}>No data</div>}
        </div>
      )}

      {statsTab === "sport" && oddsRanges.length > 0 && (
        <div style={{ background: T.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Performance by Odds Range</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {oddsRanges.map(r => (
              <div key={r.label} style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px 60px 60px", gap: 6, alignItems: "center", fontSize: 12 }}>
                <div style={{ color: T.accent, fontWeight: 700 }}>{r.label}</div>
                <div style={{ height: 5, background: T.card2, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(Math.abs(r.roi), 100)}%`, height: "100%", background: r.profitE >= 0 ? "#22c55e" : "#ef4444", borderRadius: 3 }} />
                </div>
                <div style={{ color: T.text2, textAlign: "right" }}>{r.bets}b</div>
                <div style={{ color: T.text2, textAlign: "right" }}>{r.wr.toFixed(0)}%</div>
                <div style={{ color: r.roi >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, textAlign: "right" }}>{r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px 60px 60px", gap: 6, fontSize: 10, color: T.text3, marginTop: 2 }}>
              <div></div><div></div><div style={{ textAlign: "right" }}>Bets</div><div style={{ textAlign: "right" }}>WR</div><div style={{ textAlign: "right" }}>ROI</div>
            </div>
          </div>
        </div>
      )}

      {statsTab === "league" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderGroup(byLeague, Math.max(...Object.values(byLeague).map((s) => Math.abs(s.profitE)), 1))}
          {Object.keys(byLeague).length === 0 && <div style={{ color: T.text3, textAlign: "center", padding: 20 }}>No data</div>}
        </div>
      )}

      {statsTab === "subcat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.keys(bySubCat).length > 0
            ? renderGroup(bySubCat, Math.max(...Object.values(bySubCat).map((s) => Math.abs(s.profitE)), 1))
            : <div style={{ color: T.text3, textAlign: "center", padding: 20 }}>No data</div>
          }
        </div>
      )}

      {statsTab === "book" && (
        <BookTab byBook={byBook} bets={bets} bookConfig={bookConfig} updateBookConfig={updateBookConfig} />
      )}

      {statsTab === "bk" && (
        <>
          {/* DAILY PROFIT CHART */}
          <div style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.text2, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Daily Profit Evolution {filterMonth !== "all" ? "" : "(All Time)"}
            </div>
            <LineChart data={dailyChartData} valueKey="value" colorKey="profit"
              emptyMsg="No settled bets yet" color="#2dd4bf" />
            {dailyChartData.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                <span style={{ color: T.text2 }}>Start: <b style={{ color: T.text }}>0€</b></span>
                <span style={{ color: T.text2 }}>Now: <b style={{ color: dailyChartData[dailyChartData.length-1]?.value >= 0 ? "#22c55e" : "#ef4444" }}>{dailyChartData[dailyChartData.length-1]?.value >= 0 ? "+" : ""}{dailyChartData[dailyChartData.length-1]?.value?.toFixed(2)}€</b></span>
              </div>
            )}
          </div>

          {/* GLOBAL BANKROLL SETUP */}
          <div style={{ background: T.card, borderRadius: 12, padding: "14px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: 1 }}>Bankroll</div>
              <button onClick={openBkSetup} style={{ background: T.card2, border: "none", borderRadius: 8, padding: "4px 12px", color: T.accent, fontSize: 12, cursor: "pointer" }}>
                {globalBk.initialBalance ? "Edit" : "Setup"}
              </button>
            </div>

            {globalBk.initialBalance ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div style={{ background: T.card2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Initial</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{globalBk.initialBalance.toLocaleString()}€</div>
                    <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>{globalBk.initialDate ?? "–"}</div>
                  </div>
                  <div style={{ background: T.card2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>1u =</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.accent }}>{globalBk.unitValue ?? "–"}€</div>
                  </div>
                  <div style={{ background: T.card2, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Balance</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: currentBalance >= globalBk.initialBalance ? T.win : T.lose }}>
                      {currentBalance !== null ? currentBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€" : "–"}
                    </div>
                  </div>
                </div>

                {/* Movements */}
                {movements.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {movements.sort((a, b) => a.date.localeCompare(b.date)).map(m => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 12, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ color: T.text3 }}>
                          <span style={{ marginRight: 6 }}>{m.type === "deposit" ? "↗" : "↘"}</span>
                          {m.date}{m.note ? ` · ${m.note}` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: m.type === "deposit" ? T.win : T.lose }}>
                            {m.type === "deposit" ? "+" : "-"}{Number(m.amount).toFixed(2)}€
                          </span>
                          <button onClick={() => deleteMovement(m.id)} style={{ background: "none", border: "none", color: T.lose + "66", cursor: "pointer", fontSize: 14 }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setShowMovModal(true)} style={{ width: "100%", background: "transparent", border: `1px dashed ${T.border2}`, borderRadius: 8, padding: "8px", color: T.text3, fontSize: 12, cursor: "pointer" }}>
                  + Dépôt / Retrait
                </button>
              </>
            ) : (
              <div style={{ color: T.text3, textAlign: "center", padding: "20px 0", fontSize: 13 }}>
                Configure ta bankroll initiale pour voir l'évolution du capital
              </div>
            )}
          </div>

          {/* FREEBET WALLET CARD */}
          <FBWalletCard currentFBWallet={currentFBWallet} globalBk={globalBk} bets={bets} fbAdditions={fbAdditions} addFBMovement={addFBMovement} deleteFBMovement={deleteFBMovement} />


          {/* MONTHLY BREAKDOWN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allMonths.filter(mk => filterMonth === "all" || mk === filterMonth).map((mk) => {
              const profit = monthProfit(mk);
              const endBal = balanceEndOfMonth(mk);
              const movs = monthMovements(mk);
              const netMov = movs.reduce((a, m) => a + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)), 0);
              const monthBets = bets.filter(b => monthKey(b.date) === mk);
              const settled = monthBets.filter(b => b.result !== "Pending" && b.result !== "Void");
              const wins = settled.filter(b => b.result === "Win").length;
              const invested = settled.reduce((a, b) => a + Number(b.stakeE ?? b.stakee ?? 0), 0);
              const roi = invested ? (profit / invested) * 100 : 0;
              const pendingCount = monthBets.filter(b => b.result === "Pending").length;

              return (
                <div key={mk} style={{ background: T.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{monthLabel(mk)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: profit >= 0 ? T.win : T.lose }}>
                      {profit >= 0 ? "+" : ""}{profit.toFixed(2)}€
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: 6 }}>
                    <div style={{ color: T.text3 }}>Bets<br /><b style={{ color: T.text }}>{monthBets.length}</b></div>
                    <div style={{ color: T.text3 }}>W/L<br /><b style={{ color: T.text }}>{wins}/{settled.length - wins}</b></div>
                    <div style={{ color: T.text3 }}>ROI<br /><b style={{ color: roi >= 0 ? T.win : T.lose }}>{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</b></div>
                    <div style={{ color: T.text3 }}>Pending<br /><b style={{ color: pendingCount > 0 ? T.pending : T.text3 }}>{pendingCount}</b></div>
                  </div>
                  {netMov !== 0 && (
                    <div style={{ fontSize: 11, color: T.text3, borderTop: `1px solid ${T.border}`, paddingTop: 6, marginTop: 4 }}>
                      {movs.map(m => (
                        <span key={m.id} style={{ marginRight: 10 }}>
                          {m.type === "deposit" ? "↗" : "↘"} <b style={{ color: m.type === "deposit" ? T.win : T.lose }}>{m.type === "deposit" ? "+" : "-"}{Number(m.amount).toFixed(0)}€</b>{m.note ? ` ${m.note}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {endBal !== null && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: T.text3 }}>Balance fin de mois</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                        {endBal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {allMonths.length === 0 && (
              <div style={{ color: T.text3, textAlign: "center", padding: 20 }}>Aucun pari saisi pour l'instant</div>
            )}
          </div>

          {/* SETUP MODAL */}
          {showBkSetup && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
              <div style={{ background: T.card2, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, border: `1px solid ${T.border2}` }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Bankroll Setup</div>
                {[["initialBalance", "Solde initial (€)"], ["initialDate", "Date de départ"], ["unitValue", "1 unité = (€)"], ["initialFB", "🎁 Freebets initiaux (€)"]].map(([k, lbl]) => (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontWeight: 600 }}>{lbl}</div>
                    <input type={k === "initialDate" ? "date" : "number"} value={bkSetupForm[k]} onChange={e => setBkSetupForm(f => ({ ...f, [k]: e.target.value }))}
                      style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Btn onClick={() => setShowBkSetup(false)} flex={1}>Annuler</Btn>
                  <Btn onClick={saveBkSetup} bg={T.accent} color={T.bg} flex={2}>Sauvegarder</Btn>
                </div>
              </div>
            </div>
          )}

          {/* MOVEMENT MODAL */}
          {showMovModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
              <div style={{ background: T.card2, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, border: `1px solid ${T.border2}` }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Dépôt / Retrait</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["deposit", "withdrawal"].map(t => (
                    <button key={t} onClick={() => setMovForm(f => ({ ...f, type: t }))}
                      style={{ flex: 1, background: movForm.type === t ? (t === "deposit" ? T.win + "22" : T.lose + "22") : T.card, border: `1px solid ${movForm.type === t ? (t === "deposit" ? T.win : T.lose) : T.border}`, borderRadius: 8, padding: "8px", color: movForm.type === t ? (t === "deposit" ? T.win : T.lose) : T.text2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {t === "deposit" ? "↗ Dépôt" : "↘ Retrait"}
                    </button>
                  ))}
                </div>
                {[["amount", "number", "Montant (€)"], ["date", "date", "Date"], ["note", "text", "Note (optionnel)"]].map(([k, type, lbl]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontWeight: 600 }}>{lbl}</div>
                    <input type={type} value={movForm[k]} onChange={e => setMovForm(f => ({ ...f, [k]: e.target.value }))}
                      style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Btn onClick={() => setShowMovModal(false)} flex={1}>Annuler</Btn>
                  <Btn onClick={addMovement} bg={T.accent} color={T.bg} flex={2}>Ajouter</Btn>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SHARE MODAL */}
      {showShare && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            {/* Share card — screenshot this */}
            <div id="share-card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2744 100%)", borderRadius: 20, padding: 24, border: `1px solid ${T.border2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 3, color: T.accent, textTransform: "uppercase" }}>JojoH Betting Tracker</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginTop: 4 }}>
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
                  { label: "Bets", value: total.total, color: T.text },
                  { label: "Avg Odd", value: total.avgOdd.toFixed(2), color: T.text },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {Object.entries(bySport).slice(0, 3).map(([sport, s]) => (
                <div key={sport} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #1e293b", fontSize: 13 }}>
                  <span style={{ color: T.text2 }}>{sport}</span>
                  <span style={{ fontWeight: 700, color: s.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{s.profitE >= 0 ? "+" : ""}{s.profitE.toFixed(2)}€</span>
                </div>
              ))}

              <div style={{ marginTop: 16, fontSize: 10, color: T.text3, textAlign: "center" }}>betting-tracker-one.vercel.app</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowShare(false)} style={{ flex: 1, background: T.card2, border: "none", borderRadius: 12, padding: "12px", color: T.text2, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>Close</button>
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "JojoH Betting Tracker", text: `${filterMonth !== "all" ? monthLabel(filterMonth) : "All Time"} — Profit: ${total.profitE >= 0 ? "+" : ""}${total.profitE.toFixed(2)}€ | ROI: ${total.roi.toFixed(2)}% | WR: ${total.winRate.toFixed(1)}%` });
                } else {
                  navigator.clipboard.writeText(`${filterMonth !== "all" ? monthLabel(filterMonth) : "All Time"} — Profit: ${total.profitE >= 0 ? "+" : ""}${total.profitE.toFixed(2)}€ | ROI: ${total.roi.toFixed(2)}% | WR: ${total.winRate.toFixed(1)}%`);
                  alert("Copied to clipboard!");
                }
              }} style={{ flex: 2, background: T.accent, border: "none", borderRadius: 12, padding: "12px", color: "#0a0f1e", fontSize: 14, cursor: "pointer", fontWeight: 800 }}>
                Share 📤
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: T.text3, marginTop: 8 }}>Take a screenshot of the card above to share as image</div>
          </div>
        </div>
      )}

    </div>
  );
}
