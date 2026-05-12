import { useState, useMemo, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SPORTS_CONFIG = {
  Tennis: { leagues: ["ATP", "WTA"], subCats: ["ML", "AH", "O/U", "Parlay"] },
  Baseball: { leagues: ["MLB", "KBO"], subCats: ["ML", "AH", "O/U", "HR", "Total Bases", "Parlay"] },
  Football: { leagues: ["Ligue 1", "BPL", "Liga", "Serie A", "Bundesliga", "LDC", "CDM", "Exotique"], subCats: ["ML", "AH", "O/U", "Parlay"] },
  Basketball: { leagues: ["NBA", "EuroLeague", "Autre"], subCats: ["ML", "AH", "O/U", "Parlay"] },
  eSport: { leagues: [], subCats: [] },
  "F1": { leagues: [], subCats: [] },
  Cycling: { leagues: [], subCats: [] },
};

const SPORTS = Object.keys(SPORTS_CONFIG);
const RESULTS = ["Pending", "Win", "Lose", "Void"];
const RESULT_COLORS = { Win: "#22c55e", Lose: "#ef4444", Void: "#94a3b8", Pending: "#f59e0b" };

const fmt = (n, d = 2) => n == null || isNaN(n) ? "–" : (n >= 0 ? "+" : "") + Number(n).toFixed(d);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d?.slice(0, 7) ?? "";
const monthLabel = (k) => {
  if (!k || !k.includes("-")) return k;
  const [y, m] = k.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

const Ico = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const Icons = {
  Plus: () => <Ico d="M12 5v14M5 12h14" />,
  List: () => <Ico d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  Chart: () => <Ico d="M3 3v18h18M7 16l4-4 4 4 4-8" />,
  Trash: ({ s }) => <Ico d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={s} />,
  Edit: ({ s }) => <Ico d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={s} />,
  Upload: () => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  Download: () => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
};

const Sparkline = ({ data }) => {
  if (data.length < 2) return null;
  const vals = data.map(d => d.val);
  const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 300},${40 - ((d.val - min) / range) * 30}`).join(" ");
  return (
    <svg viewBox="0 0 300 40" style={{ width: "100%", height: 40, marginTop: 10 }}>
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

export default function App() {
  const [tab, setTab] = useState("add");
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");
  const [editId, setEditId] = useState(null);
  
  const empty = () => ({ date: today(), sport: "Tennis", league: "ATP", subCat: "ML", bet: "", odd: "", stakeE: 60, stakeU: 1, result: "Pending" });
  const [batchForms, setBatchForms] = useState([empty()]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('bets').select('*').order('date', { ascending: false });
      if (data) setBets(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    const valid = batchForms.filter(f => f.bet && f.odd);
    if (!valid.length) return;
    if (editId) {
      await supabase.from('bets').update(valid[0]).eq('id', editId);
      setBets(bets.map(b => b.id === editId ? { ...valid[0], id: editId } : b));
      setEditId(null);
    } else {
      const { data } = await supabase.from('bets').insert(valid).select();
      if (data) setBets([...data, ...bets]);
    }
    setBatchForms([empty()]);
    setTab("list");
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const lines = evt.target.result.split("\n").slice(1);
      const toInsert = lines.map(l => {
        const [date, sport, league, subCat, bet, odd, stakeE, stakeU, result] = l.split(",");
        if (!date || !odd) return null;
        return { date, sport, league, subCat, bet, odd: parseFloat(odd), stakeE: parseFloat(stakeE), stakeU: parseFloat(stakeU), result: result?.trim() };
      }).filter(x => x);
      const { data } = await supabase.from('bets').insert(toInsert).select();
      if (data) setBets([...data, ...bets]);
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const head = "date,sport,league,subCat,bet,odd,stakeE,stakeU,result\n";
    const csv = head + bets.map(b => `${b.date},${b.sport},${b.league},${b.subCat},${b.bet},${b.odd},${b.stakeE},${b.stakeU},${b.result}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `bets_${today()}.csv`; a.click();
  };

  const allMonths = useMemo(() => [...new Set(bets.map(b => monthKey(b.date)))].sort().reverse(), [bets]);
  const filtered = useMemo(() => filterMonth === "all" ? bets : bets.filter(b => monthKey(b.date) === filterMonth), [bets, filterMonth]);

  const stats = useMemo(() => {
    let pE = 0, invE = 0, wins = 0, settled = 0;
    filtered.forEach(b => {
      if (b.result === "Win") { pE += (b.odd - 1) * b.stakeE; wins++; settled++; invE += b.stakeE; }
      else if (b.result === "Lose") { pE -= b.stakeE; settled++; invE += b.stakeE; }
    });
    return { profitE: pE, roi: invE ? (pE / invE) * 100 : 0, count: filtered.length, wr: settled ? (wins / settled) * 100 : 0 };
  }, [filtered]);

  const chartData = useMemo(() => {
    let acc = 0;
    return [...bets].reverse().map(b => {
      if (b.result === "Win") acc += (b.odd - 1) * b.stakeE;
      else if (b.result === "Lose") acc -= b.stakeE;
      return { val: acc };
    });
  }, [bets]);

  if (loading) return <div style={{ height: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", maxWidth: 500, margin: "0 auto", paddingBottom: 110 }}>
      <div style={{ padding: 20, background: "#0f172a", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#38bdf8", letterSpacing: 2 }}>BET TRACKER PRO</div>
          <div style={{ display: "flex", gap: 15 }}>
            <label style={{ cursor: "pointer" }}><Icons.Upload /><input type="file" hidden accept=".csv" onChange={importCSV} /></label>
            <button onClick={exportCSV} style={{ background: "none", border: "none", color: "#e2e8f0", cursor: "pointer" }}><Icons.Download /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          <button onClick={() => setFilterMonth("all")} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filterMonth === "all" ? "#38bdf8" : "#334155", background: filterMonth === "all" ? "#38bdf822" : "#1e293b", color: filterMonth === "all" ? "#38bdf8" : "#94a3b8", whiteSpace: "nowrap" }}>All Time</button>
          {allMonths.map(m => (
            <button key={m} onClick={() => setFilterMonth(m)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid", borderColor: filterMonth === m ? "#38bdf8" : "#334155", background: filterMonth === m ? "#38bdf822" : "#1e293b", color: filterMonth === m ? "#38bdf8" : "#94a3b8", whiteSpace: "nowrap" }}>{monthLabel(m)}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 15 }}>
        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{editId ? "Edit" : "Add Bets"}</h3>
              {!editId && <button onClick={() => setBatchForms([...batchForms, empty()])} style={{ background: "#1e293b", color: "#38bdf8", border: "none", padding: "8px 12px", borderRadius: 8 }}>+ Add Bet</button>}
            </div>
            {batchForms.map((f, i) => (
              <div key={i} style={{ background: "#111827", padding: 15, borderRadius: 14, border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={f.date} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 10, borderRadius: 10 }} />
                  <select value={f.sport} onChange={e => {
                    const s = e.target.value;
                    setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, sport: s, league: SPORTS_CONFIG[s].leagues[0] || "", subCat: SPORTS_CONFIG[s].subCats[0] || "" } : x));
                  }} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 10, borderRadius: 10 }}>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={f.league} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, league: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 10, borderRadius: 10 }}>
                    {SPORTS_CONFIG[f.sport].leagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={f.subCat} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, subCat: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 10, borderRadius: 10 }}>
                    {SPORTS_CONFIG[f.sport].subCats.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <input placeholder="Description" value={f.bet} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, bet: e.target.value } : x))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 10, marginBottom: 4, color: "#64748b" }}>ODD</div><input type="number" step="0.01" value={f.odd} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, odd: parseFloat(e.target.value) } : x))} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 10 }} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 10, marginBottom: 4, color: "#64748b" }}>STAKE €</div><input type="number" value={f.stakeE} onChange={e => { const val = parseFloat(e.target.value); setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, stakeE: val, stakeU: val / 60 } : x)); }} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 10 }} /></div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {RESULTS.map(r => <button key={r} onClick={() => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, result: r } : x))} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid", borderColor: f.result === r ? RESULT_COLORS[r] : "#334155", background: f.result === r ? RESULT_COLORS[r] + "22" : "#1e293b", color: f.result === r ? RESULT_COLORS[r] : "#94a3b8", fontSize: 12 }}>{r}</button>)}
                </div>
              </div>
            ))}
            <button onClick={handleSave} style={{ background: "#38bdf8", color: "#0a0f1e", padding: 18, borderRadius: 14, border: "none", fontWeight: 800, fontSize: 16 }}>SAVE TO CLOUD</button>
          </div>
        )}

        {tab === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: "#111827", padding: 14, borderRadius: 14, borderLeft: `5px solid ${RESULT_COLORS[b.result]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{b.date} • {b.sport} • {b.league}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{b.bet} <span style={{ color: "#475569", fontSize: 11 }}>({b.subCat})</span></div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>@{b.odd} • {b.stakeE}€ ({b.stakeU}u)</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: RESULT_COLORS[b.result], fontWeight: 900 }}>{b.result === "Win" ? "+" + ((b.odd - 1) * b.stakeE).toFixed(2) + "€" : b.result}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                      <button onClick={() => { setBatchForms([{...b}]); setEditId(b.id); setTab("add"); }} style={{ background: "none", border: "none", color: "#475569" }}><Icons.Edit s={18} /></button>
                      <button onClick={async () => { await supabase.from('bets').delete().eq('id', b.id); setBets(bets.filter(x => x.id !== b.id)); }} style={{ background: "none", border: "none", color: "#ef4444" }}><Icons.Trash s={18} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ background: "#111827", padding: 15, borderRadius: 14, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>BANKROLL EVOLUTION</div>
              <Sparkline data={chartData} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#111827", padding: 15, borderRadius: 14, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 10, color: "#64748b" }}>PROFIT</div><div style={{ fontSize: 20, fontWeight: 800, color: stats.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(stats.profitE)}€</div></div>
              <div style={{ background: "#111827", padding: 15, borderRadius: 14, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 10, color: "#64748b" }}>ROI</div><div style={{ fontSize: 20, fontWeight: 800, color: stats.roi >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(stats.roi)}%</div></div>
              <div style={{ background: "#111827", padding: 15, borderRadius: 14, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 10, color: "#64748b" }}>BETS</div><div style={{ fontSize: 20, fontWeight: 800 }}>{stats.count}</div></div>
              <div style={{ background: "#111827", padding: 15, borderRadius: 14, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 10, color: "#64748b" }}>WIN RATE</div><div style={{ fontSize: 20, fontWeight: 800 }}>{stats.wr.toFixed(1)}%</div></div>
            </div>
          </div>
        )}
      </div>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0f172a", display: "flex", justifyContent: "space-around", padding: "15px 0 35px", borderTop: "1px solid #1e293b" }}>
        <button onClick={() => setTab("add")} style={{ background: "none", border: "none", color: tab === "add" ? "#38bdf8" : "#475569" }}><Icons.Plus /><div style={{ fontSize: 10 }}>Add</div></button>
        <button onClick={() => setTab("list")} style={{ background: "none", border: "none", color: tab === "list" ? "#38bdf8" : "#475569" }}><Icons.List /><div style={{ fontSize: 10 }}>Bets</div></button>
        <button onClick={() => setTab("stats")} style={{ background: "none", border: "none", color: tab === "stats" ? "#38bdf8" : "#475569" }}><Icons.Chart /><div style={{ fontSize: 10 }}>Stats</div></button>
      </nav>
    </div>
  );
}
