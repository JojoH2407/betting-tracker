import { useState, useMemo } from "react";

// ── SPORTS CONFIG ─────────────────────────────────────────────────────────────
const SPORTS_CONFIG = {
  Tennis: {
    leagues: ["ATP", "WTA"],
    subCats: ["ML", "AH", "O/U", "Parlay"],
  },
  Baseball: {
    leagues: ["MLB", "KBO"],
    subCats: ["ML", "AH", "O/U", "HR", "Total Bases", "Parlay"],
  },
  Football: {
    leagues: ["Ligue 1", "BPL", "Liga", "Serie A", "Bundesliga", "LDC", "CDM", "Exotique"],
    subCats: ["ML", "AH", "O/U", "Parlay"],
  },
  Basketball: {
    leagues: ["NBA", "EuroLeague", "Autre"],
    subCats: ["ML", "AH", "O/U", "Parlay"],
  },
  eSport: { leagues: [], subCats: [] },
  "F1": { leagues: [], subCats: [] },
  Cycling: { leagues: [], subCats: [] },
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
const today = () => new Date().toISOString().slice(0, 10);
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
  const stake = field === "E" ? Number(bet.stakeE) : Number(bet.stakeU);
  if (bet.result === "Win") return (Number(bet.odd) - 1) * stake;
  if (bet.result === "Lose") return -stake;
  return 0;
};

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
const Sparkline = ({ data }) => {
  if (!data || data.length < 2) return (
    <div style={{ textAlign: "center", color: "#475569", padding: "20px 0", fontSize: 13 }}>
      Fill in monthly bankroll end values to see the chart
    </div>
  );
  const vals = data.map((d) => d.bk);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 340, H = 80, pad = 12;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (H - pad * 2) - ((d.bk - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const polyline = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <polyline points={polyline} fill="none" stroke="#38bdf8" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5}
          fill={data[i].profit >= 0 ? "#22c55e" : "#ef4444"} />
      ))}
      <circle cx={lx} cy={ly} r={5} fill="#38bdf8" opacity={0.9} />
    </svg>
  );
};

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
    const rows = bets.map((b) => ({
      Date: b.date,
      Sport: b.sport,
      League: b.league,
      "Sub-cat": b.subCat,
      Bet: b.bet,
      Odd: Number(b.odd),
      "Stake (€)": Number(b.stakeE),
      "Stake (u)": Number(b.stakeU),
      Result: b.result,
      "Profit (€)": calcProfit(b, "E"),
      "Profit (u)": calcProfit(b, "U"),
      Note: b.note ?? "",
    }));
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
  const [statsTab, setStatsTab] = useState("sport"); // sport | league | bk
  const [bets, setBets] = useState(() => load("bets_v2", []));
  const [bankroll, setBankrollState] = useState(() => load("bankroll_v2", {}));
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const emptyForm = {
    date: today(), sport: "Tennis", league: "ATP", subCat: "ML",
    bet: "", odd: "", stakeE: 60, stakeU: 1, result: "Pending", note: "",
  };
  const [form, setForm] = useState(emptyForm);

  const updateBets = (next) => { setBets(next); save("bets_v2", next); };
  const updateBankroll = (next) => { setBankrollState(next); save("bankroll_v2", next); };

  const setF = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "sport") {
      next.league = SPORTS_CONFIG[v].leagues[0] ?? "";
      next.subCat = SPORTS_CONFIG[v].subCats[0] ?? "";
    }
    if (k === "league" || k === "sport") {
      // auto-fill stakeU from bankroll
    }
    return next;
  });

  // auto stakeU from current month BK config
  const currentMonthBK = bankroll[monthKey(form.date)];
  const unitValue = currentMonthBK?.unitValue ?? null;

  const handleSubmit = () => {
    if (!form.bet || !form.odd) return;
    const stakeU = unitValue ? (Number(form.stakeE) / unitValue).toFixed(2) : form.stakeU;
    const entry = { ...form, stakeU, id: editId ?? Date.now() };
    if (editId !== null) {
      updateBets(bets.map((b) => (b.id === editId ? entry : b)));
      setEditId(null);
    } else {
      updateBets([...bets, entry]);
    }
    setForm(emptyForm);
    setTab("list");
  };

  const startEdit = (bet) => { setForm({ ...bet }); setEditId(bet.id); setTab("add"); };
  const deleteBet = (id) => { updateBets(bets.filter((b) => b.id !== id)); setDeleteConfirm(null); };

  // months
  const allMonths = useMemo(() => [...new Set(bets.map((b) => monthKey(b.date)))].sort(), [bets]);

  const filtered = useMemo(() =>
    filterMonth === "all" ? bets : bets.filter((b) => monthKey(b.date) === filterMonth),
    [bets, filterMonth]);

  // group stats helper
  const groupStats = (bets, key) => {
    const map = {};
    bets.forEach((b) => {
      const k = b[key] || "–";
      if (!map[k]) map[k] = { bets: [], wins: 0, profitE: 0, profitU: 0, totalInvE: 0, oddsSum: 0, oddsCount: 0 };
      const s = map[k];
      s.bets.push(b);
      if (b.result === "Win") { s.wins++; s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      else if (b.result === "Lose") { s.profitE += calcProfit(b, "E"); s.profitU += calcProfit(b, "U"); }
      if (b.result !== "Void" && b.result !== "Pending") { s.totalInvE += Number(b.stakeE); }
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
      if (b.result !== "Void" && b.result !== "Pending") { totalInvE += Number(b.stakeE); totalInvU += Number(b.stakeU); }
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

  // CSV import
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imported = parseCSV(ev.target.result);
      updateBets([...bets, ...imported]);
      alert(`✅ ${imported.length} bets imported!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cfg = SPORTS_CONFIG[form.sport];
  const hasLeague = cfg.leagues.length > 0;
  const hasSubCat = cfg.subCats.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif", maxWidth: 500, margin: "0 auto", paddingBottom: 90 }}>

      {/* HEADER */}
      <div style={{ background: "#0f172a", padding: "18px 18px 14px", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#38bdf8", textTransform: "uppercase", marginBottom: 2 }}>BET TRACKER</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 10 }}>
          {filterMonth === "all" ? "All Time" : monthLabel(filterMonth)}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <Pill label="All" active={filterMonth === "all"} onClick={() => setFilterMonth("all")} />
          {allMonths.map((mk) => <Pill key={mk} label={monthLabel(mk)} active={filterMonth === mk} onClick={() => setFilterMonth(mk)} />)}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {tab === "add" && (
          <AddTab form={form} setF={setF} handleSubmit={handleSubmit}
            editId={editId} setEditId={setEditId} setForm={setForm}
            emptyForm={emptyForm} setTab={setTab}
            hasLeague={hasLeague} hasSubCat={hasSubCat} cfg={cfg}
            unitValue={unitValue} />
        )}
        {tab === "list" && (
          <ListTab bets={filtered} onEdit={startEdit} onDelete={setDeleteConfirm}
            onExport={() => exportXLSX(bets)} onImport={handleCSVImport}
            filterMonth={filterMonth}
            onDeleteAll={() => {
              if (filterMonth === "all") updateBets([]);
              else updateBets(bets.filter((b) => monthKey(b.date) !== filterMonth));
            }} />
        )}
        {tab === "stats" && (
          <StatsTab total={total} bySport={bySport} byLeague={byLeague}
            maxProfitAbs={maxProfitAbs} bkChartData={bkChartData}
            bankroll={bankroll} updateBankroll={updateBankroll}
            allMonths={allMonths} statsTab={statsTab} setStatsTab={setStatsTab}
            bets={bets} />
        )}
      </div>

      {/* NAV */}
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
function AddTab({ form, setF, handleSubmit, editId, setEditId, setForm, emptyForm, setTab, hasLeague, hasSubCat, cfg, unitValue }) {
  const computedU = unitValue ? (Number(form.stakeE) / unitValue).toFixed(2) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
        {editId ? "✏️ Edit Bet" : "➕ New Bet"}
      </div>

      {/* DATE */}
      <Input label="Date" type="date" value={form.date} onChange={(e) => setF("date", e.target.value)} />

      {/* SPORT */}
      <div>
        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Sport</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(SPORTS_CONFIG).map((s) => <Chip key={s} label={s} active={form.sport === s} onClick={() => setF("sport", s)} />)}
        </div>
      </div>

      {/* LEAGUE */}
      {hasLeague && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>League</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cfg.leagues.map((l) => <Chip key={l} label={l} active={form.league === l} onClick={() => setF("league", l)} />)}
          </div>
        </div>
      )}

      {/* SUB-CAT */}
      {hasSubCat && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Type</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cfg.subCats.map((s) => <Chip key={s} label={s} active={form.subCat === s} onClick={() => setF("subCat", s)} />)}
          </div>
        </div>
      )}

      {/* BET */}
      <Input label="Bet Description" placeholder="e.g. Djokovic vs Alcaraz ML" value={form.bet} onChange={(e) => setF("bet", e.target.value)} />

      {/* ODD + STAKES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Input label="Odd" type="number" step="0.01" placeholder="2.10" value={form.odd} onChange={(e) => setF("odd", e.target.value)} />
        <Input label="Stake €" type="number" value={form.stakeE} onChange={(e) => setF("stakeE", e.target.value)} />
        <div>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Stake u</div>
          {computedU ? (
            <div style={{ background: "#1e293b", border: "1px solid #38bdf833", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#38bdf8", fontWeight: 700 }}>
              {computedU}u
            </div>
          ) : (
            <input type="number" step="0.25" value={form.stakeU} onChange={(e) => setF("stakeU", e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 14px", color: "#f8fafc", fontSize: 15, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" }} />
          )}
          {unitValue && <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Auto (1u = {unitValue}€)</div>}
        </div>
      </div>

      {/* RESULT */}
      <div>
        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Result</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {RESULTS.map((r) => <Chip key={r} label={r} active={form.result === r} onClick={() => setF("result", r)} color={RESULT_COLORS[r]} />)}
        </div>
      </div>

      {/* NOTE */}
      <Input label="Note (optional)" placeholder="Analysis, context..." value={form.note} onChange={(e) => setF("note", e.target.value)} />

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {editId && <Btn onClick={() => { setEditId(null); setForm(emptyForm); setTab("list"); }} flex={1}>Cancel</Btn>}
        <button onClick={handleSubmit} style={{ flex: 2, background: "#38bdf8", border: "none", borderRadius: 12, padding: "16px", color: "#0a0f1e", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
          {editId ? "Update" : "Save Bet"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// LIST TAB
// ════════════════════════════════════════════════════════════════════════════════
function ListTab({ bets, onEdit, onDelete, onExport, onImport, onDeleteAll, filterMonth }) {
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const sorted = [...bets].sort((a, b) => b.date.localeCompare(a.date));

  const groups = {};
  sorted.forEach((b) => { if (!groups[b.date]) groups[b.date] = []; groups[b.date].push(b); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* toolbar */}
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px", color: "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icons.Upload /> Import CSV
          <input type="file" accept=".csv" onChange={onImport} style={{ display: "none" }} />
        </label>
        <button onClick={onExport} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px", color: "#94a3b8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icons.Download /> Export XLSX
        </button>
      </div>
      {showDeleteAll ? (
        <div style={{ background: "#1e293b", border: "1px solid #ef4444", borderRadius: 12, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>Delete all bets? This cannot be undone.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteAll(false)} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 10, padding: "10px", color: "#f8fafc", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={() => { onDeleteAll(); setShowDeleteAll(false); }} style={{ flex: 1, background: "#ef4444", border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Yes, delete all</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowDeleteAll(true)} style={{ background: "none", border: "1px solid #ef444433", borderRadius: 10, padding: "10px", color: "#ef4444", fontSize: 13, cursor: "pointer", width: "100%" }}>
          🗑 Delete {filterMonth === "all" ? "all" : "this month's"} bets
        </button>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", padding: "60px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div>No bets for this period</div>
        </div>
      )}

      {Object.entries(groups).map(([date, dayBets]) => (
        <div key={date}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dayBets.map((b) => <BetCard key={b.id} bet={b} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BetCard({ bet, onEdit, onDelete }) {
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
            <span>@{Number(bet.odd).toFixed(2)}</span>
            <span>{bet.stakeE}€ / {Number(bet.stakeU).toFixed(2)}u</span>
          </div>
          {bet.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{bet.note}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {bet.result !== "Pending" && bet.result !== "Void" && (
            <div style={{ fontSize: 16, fontWeight: 700, color: profitE >= 0 ? "#22c55e" : "#ef4444" }}>
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
function StatsTab({ total, bySport, byLeague, maxProfitAbs, bkChartData, bankroll, updateBankroll, allMonths, statsTab, setStatsTab, bets }) {
  const [bkEdit, setBkEdit] = useState(null);
  const [bkForm, setBkForm] = useState({ start: "", end: "", unitValue: "", fees: "" });

  const openBkEdit = (mk) => {
    setBkEdit(mk);
    const bk = bankroll[mk] ?? {};
    setBkForm({ start: bk.start ?? "", end: bk.end ?? "", unitValue: bk.unitValue ?? "", fees: bk.fees ?? "" });
  };
  const saveBk = () => {
    updateBankroll({ ...bankroll, [bkEdit]: { start: Number(bkForm.start), end: Number(bkForm.end), unitValue: Number(bkForm.unitValue), fees: Number(bkForm.fees) } });
    setBkEdit(null);
  };

  // Running balance per month = start BK + profit from bets
  const runningBalance = (mk) => {
    const bk = bankroll[mk] ?? {};
    if (!bk.start) return null;
    const profit = bets.filter((b) => monthKey(b.date) === mk).reduce((acc, b) => acc + calcProfit(b, "E"), 0);
    return bk.start + profit;
  };

  const renderGroup = (map, maxAbs) => Object.entries(map).map(([name, s]) => {
    const settled = s.bets.filter((b) => b.result !== "Void" && b.result !== "Pending").length;
    const wr = settled ? (s.wins / settled) * 100 : 0;
    const avgOdd = s.oddsCount ? s.oddsSum / s.oddsCount : 0;
    const avgStakeU = settled ? s.bets.filter(b => b.result !== "Void" && b.result !== "Pending").reduce((a, b) => a + Number(b.stakeU), 0) / settled : 0;
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

      {/* SUB-TABS */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>
        {[["sport", "By Sport"], ["league", "By League"], ["bk", "Bankroll"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatsTab(k)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: statsTab === k ? "#38bdf8" : "#475569", borderBottom: statsTab === k ? "2px solid #38bdf8" : "2px solid transparent", paddingBottom: 4 }}>{l}</button>
        ))}
      </div>

      {statsTab === "sport" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderGroup(bySport, maxProfitAbs)}
          {Object.keys(bySport).length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>No data</div>}
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
                        {running.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Also show months with BK config but no bets yet */}
            {Object.keys(bankroll).filter(mk => !allMonths.includes(mk)).map(mk => {
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
              <Btn onClick={() => setBkEdit(null)} flex={1}>Cancel</Btn>
              <Btn onClick={saveBk} bg="#38bdf8" color="#0a0f1e" flex={1}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
