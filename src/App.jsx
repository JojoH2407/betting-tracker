import { useState, useMemo, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase utilisant les variables d'environnement Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      Setup monthly bankrolls to see evolution
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

// ── UI COMPONENTS (KPI, Btn, etc.) ───────────────────────────────────────────
function KPI({ label, value, color, large }) {
  return (
    <div style={{ background: "#111827", borderRadius: 12, padding: large ? "14px 16px" : "12px 14px", border: "1px solid #1e293b", textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 20 : 17, fontWeight: 800, color: color ?? "#f8fafc" }}>{value}</div>
    </div>
  );
}

const Tag = ({ children, color }) => (
  <span style={{
    fontSize: 11, borderRadius: 6, padding: "2px 8px",
    background: color ? color + "22" : "#1e293b",
    color: color ?? "#94a3b8",
    border: color ? `1px solid ${color}44` : "none",
  }}>{children}</span>
);

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

// ════════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("add");
  const [statsTab, setStatsTab] = useState("bk");
  const [bets, setBets] = useState([]);
  const [bankroll, setBankrollState] = useState({});
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [batchForms, setBatchForms] = useState([emptyBetForm()]);

  // CHARGEMENT DES DONNÉES DEPUIS SUPABASE
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: betsData } = await supabase.from('bets').select('*').order('date', { ascending: false });
      if (betsData) setBets(betsData);

      const { data: bkData } = await supabase.from('bankroll').select('*');
      if (bkData) {
        const bkMap = {};
        bkData.forEach(d => {
          bkMap[d.month_key] = { start: d.start_bk, end: d.end_bk, unitValue: d.unit_value, fees: d.fees };
        });
        setBankrollState(bkMap);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const currentMonthBK = bankroll[monthKey(batchForms[0]?.date ?? today())];
  const unitValue = currentMonthBK?.unitValue ?? null;

  const handleSaveAll = async () => {
    const valid = batchForms.filter(f => f.bet && f.odd);
    if (!valid.length) return;

    if (editId !== null) {
      const f = valid[0];
      const stakeU = unitValue ? (Number(f.stakeE) / unitValue).toFixed(2) : f.stakeU;
      const { error } = await supabase.from('bets').update({ ...f, stakeU }).eq('id', editId);
      if (!error) {
        setBets(bets.map((b) => (b.id === editId ? { ...f, stakeU, id: editId } : b)));
        setEditId(null);
      }
    } else {
      const newEntries = valid.map(f => {
        const stakeU = unitValue ? (Number(f.stakeE) / unitValue).toFixed(2) : f.stakeU;
        const { id, ...data } = f; // On laisse Supabase générer l'UUID
        return { ...data, stakeU };
      });
      const { data, error } = await supabase.from('bets').insert(newEntries).select();
      if (!error && data) {
        setBets([...data, ...bets]);
      }
    }
    setBatchForms([emptyBetForm()]);
    setTab("list");
  };

  const deleteBet = async (id) => {
    const { error } = await supabase.from('bets').delete().eq('id', id);
    if (!error) {
      setBets(bets.filter((b) => b.id !== id));
      setDeleteConfirm(null);
    }
  };

  const updateBankroll = async (nextKey, nextVal) => {
    const { error } = await supabase.from('bankroll').upsert({
      month_key: nextKey,
      start_bk: nextVal.start,
      end_bk: nextVal.end,
      unit_value: nextVal.unitValue,
      fees: nextVal.fees
    });
    if (!error) {
      setBankrollState({ ...bankroll, [nextKey]: nextVal });
    }
  };

  const startEdit = (bet) => { setBatchForms([{ ...bet }]); setEditId(bet.id); setTab("add"); };

  // Logique de filtrage et stats (Inchangée par rapport à ton code)
  const allMonths = useMemo(() => [...new Set(bets.map((b) => monthKey(b.date)))].sort(), [bets]);
  const filtered = useMemo(() => filterMonth === "all" ? bets : bets.filter((b) => monthKey(b.date) === filterMonth), [bets, filterMonth]);

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

  if (loading) return <div style={{ height: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontSize: 14 }}>🚀 JojoH_New_Era is loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'SF Pro Display', sans-serif", maxWidth: 500, margin: "0 auto", paddingBottom: 90 }}>
      {/* HEADER */}
      <div style={{ background: "#0f172a", padding: "18px 18px 14px", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#38bdf8", textTransform: "uppercase", marginBottom: 2 }}>BET TRACKER CLOUD</div>
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
          <AddTab batchForms={batchForms} setBatchForms={setBatchForms}
            handleSaveAll={handleSaveAll} editId={editId} setEditId={setEditId}
            setTab={setTab} unitValue={unitValue} />
        )}
        {tab === "list" && (
          <ListTab bets={filtered} onEdit={startEdit} onDelete={setDeleteConfirm} filterMonth={filterMonth} />
        )}
        {tab === "stats" && (
          <StatsTab total={total} bySport={bySport} byLeague={byLeague}
            bkChartData={bkChartData} bankroll={bankroll} updateBankroll={updateBankroll}
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
          <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === key ? "#38bdf8" : "#475569", fontSize: 11, fontWeight: 600 }}>
            {icon}{label}
          </button>
        ))}
      </nav>

      {/* DELETE MODAL */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, margin: 20, border: "1px solid #334155", maxWidth: 320, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete this bet?</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS (ADD, LIST, STATS) - Version Simplifiée adaptée Supabase
// ─────────────────────────────────────────────────────────────────────────────

function emptyBetForm(base = {}) {
  return {
    date: base.date ?? new Date().toISOString().slice(0, 10),
    sport: base.sport ?? "Tennis",
    league: base.league ?? "ATP",
    subCat: base.subCat ?? "ML",
    bet: "",
    odd: "",
    stakeE: base.stakeE ?? 60,
    stakeU: base.stakeU ?? 1,
    result: "Pending",
    note: "",
  };
}

function AddTab({ batchForms, setBatchForms, handleSaveAll, editId, setEditId, setTab, unitValue }) {
  const updateForm = (i, val) => setBatchForms(batchForms.map((f, idx) => idx === i ? val : f));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {batchForms.map((f, i) => (
        <BetForm key={i} index={i} form={f} onChange={(val) => updateForm(i, val)} unitValue={unitValue} />
      ))}
      <button onClick={handleSaveAll} style={{ background: "#38bdf8", border: "none", borderRadius: 12, padding: "16px", color: "#0a0f1e", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
        {editId ? "Update Bet" : "Save Bet"}
      </button>
    </div>
  );
}

function BetForm({ form, onChange, unitValue }) {
  const cfg = SPORTS_CONFIG[form.sport] ?? { leagues: [], subCats: [] };
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
      <Input label="Date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
      <div>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Sport</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {SPORTS.map((s) => <Chip key={s} label={s} active={form.sport === s} onClick={() => set("sport", s)} />)}
        </div>
      </div>
      {cfg.leagues.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>League</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {cfg.leagues.map((l) => <Chip key={l} label={l} active={form.league === l} onClick={() => set("league", l)} />)}
          </div>
        </div>
      )}
      <Input placeholder="Description (ex: Djokovic ML)" value={form.bet} onChange={(e) => set("bet", e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Input label="Odd" type="number" step="0.001" value={form.odd} onChange={(e) => set("odd", e.target.value)} />
        <Input label="Stake €" type="number" value={form.stakeE} onChange={(e) => set("stakeE", e.target.value)} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Result</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RESULTS.map((r) => <Chip key={r} label={r} active={form.result === r} onClick={() => set("result", r)} color={RESULT_COLORS[r]} />)}
        </div>
      </div>
    </div>
  );
}

function ListTab({ bets, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {bets.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>No bets found</div>}
      {bets.map(b => (
        <div key={b.id} style={{ background: "#111827", borderRadius: 12, padding: "12px", border: `1px solid ${RESULT_COLORS[b.result]}44` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{b.date} · {b.sport} {b.league && `· ${b.league}`}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{b.bet}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>@{b.odd} · {b.stakeE}€ ({b.stakeU}u)</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: RESULT_COLORS[b.result] }}>{b.result}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => onEdit(b)} style={{ background: "#1e293b", border: "none", color: "#94a3b8", padding: 4, borderRadius: 4 }}><Icons.Edit s={14} /></button>
                <button onClick={() => onDelete(b.id)} style={{ background: "#1e293b", border: "none", color: "#ef4444", padding: 4, borderRadius: 4 }}><Icons.Trash s={14} /></button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsTab({ total, bySport, bkChartData, bankroll, updateBankroll, allMonths, statsTab, setStatsTab, bets }) {
  const [bkEdit, setBkEdit] = useState(null);
  const [bkForm, setBkForm] = useState({ start: 5900, end: 0, unitValue: 60, fees: 0 });

  const saveBk = () => {
    updateBankroll(bkEdit, bkForm);
    setBkEdit(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KPI label="Total Profit" value={fmt(total.profitE) + "€"} color={total.profitE >= 0 ? "#22c55e" : "#ef4444"} large />
        <KPI label="ROI" value={fmt(total.roi) + "%"} color={total.roi >= 0 ? "#22c55e" : "#ef4444"} large />
      </div>

      <div style={{ background: "#111827", borderRadius: 12, padding: 14, border: "1px solid #1e293b" }}>
        <Sparkline data={bkChartData} />
      </div>

      <button onClick={() => { setBkEdit(monthKey(today())); }} style={{ background: "#1e293b", border: "1px dashed #334155", borderRadius: 12, padding: "12px", color: "#38bdf8", cursor: "pointer" }}>
        ⚙︎ Configure Bankroll (Current Month)
      </button>

      {bkEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1e293b", padding: 20, borderRadius: 16, width: "85%" }}>
            <div style={{ marginBottom: 15, fontWeight: 700 }}>Bankroll Setup - {bkEdit}</div>
            <Input label="Starting BK (€)" type="number" value={bkForm.start} onChange={e => setBkForm({...bkForm, start: e.target.value})} />
            <br/>
            <Input label="1 Unit = (€)" type="number" value={bkForm.unitValue} onChange={e => setBkForm({...bkForm, unitValue: e.target.value})} />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn onClick={() => setBkEdit(null)} flex={1}>Cancel</Btn>
              <Btn onClick={saveBk} bg="#38bdf8" color="#0a0f1e" flex={1}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
