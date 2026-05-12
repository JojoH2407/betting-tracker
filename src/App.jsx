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

const fmt = (n, d = 2) => n == null || isNaN(n) ? "0.00" : (n >= 0 ? "+" : "") + Number(n).toFixed(d);
const today = () => new Date().toISOString().slice(0, 10);

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

export default function App() {
  const [tab, setTab] = useState("add");
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [batchForms, setBatchForms] = useState([{ date: today(), sport: "Tennis", league: "ATP", subCat: "ML", bet: "", odd: "", stakeE: 60, stakeU: 1, result: "Pending" }]);

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
    setBatchForms([{ date: today(), sport: "Tennis", league: "ATP", subCat: "ML", bet: "", odd: "", stakeE: 60, stakeU: 1, result: "Pending" }]);
    setTab("list");
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target.result;
      const lines = content.split("\n").filter(l => l.trim() !== "");
      // On ignore le header s'il existe
      const startIdx = (lines[0].toLowerCase().includes("date")) ? 1 : 0;
      
      const toInsert = lines.slice(startIdx).map(l => {
        const p = l.split(",");
        if (p.length < 6) return null;
        return {
          date: p[0]?.trim() || today(),
          sport: p[1]?.trim() || "Tennis",
          league: p[2]?.trim() || "",
          subCat: p[3]?.trim() || "",
          bet: p[4]?.trim() || "Pari importé",
          odd: parseFloat(p[5]) || 0,
          stakeE: parseFloat(p[6]) || 60,
          stakeU: parseFloat(p[7]) || 1,
          result: p[8]?.trim() || "Pending"
        };
      }).filter(x => x && x.odd > 0);

      if (toInsert.length > 0) {
        const { data, error } = await supabase.from('bets').insert(toInsert).select();
        if (error) alert("Erreur import: " + error.message);
        if (data) setBets([...data, ...bets]);
      }
    };
    reader.readAsText(file);
  };

  const stats = useMemo(() => {
    let pE = 0, invE = 0, wins = 0, settled = 0;
    bets.forEach(b => {
      if (b.result === "Win") { pE += (b.odd - 1) * b.stakeE; wins++; settled++; invE += b.stakeE; }
      else if (b.result === "Lose") { pE -= b.stakeE; settled++; invE += b.stakeE; }
    });
    return { profitE: pE, roi: invE ? (pE / invE) * 100 : 0, count: bets.length, wr: settled ? (wins / settled) * 100 : 0 };
  }, [bets]);

  if (loading) return <div style={{ height: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontFamily: "sans-serif" }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f8fafc", maxWidth: 500, margin: "0 auto", paddingBottom: 120, fontFamily: "-apple-system, system-ui, sans-serif" }}>
      
      {/* HEADER FIXE */}
      <div style={{ padding: "20px 15px", background: "#0f172a", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>BetTracker <span style={{ color: "#38bdf8" }}>Cloud</span></div>
        <div style={{ display: "flex", gap: 15 }}>
           <label style={{ cursor: "pointer", color: "#94a3b8" }}><Icons.Upload /><input type="file" hidden accept=".csv" onChange={importCSV} /></label>
           <button onClick={() => {}} style={{ background: "none", border: "none", color: "#94a3b8" }}><Icons.Download /></button>
        </div>
      </div>

      <div style={{ padding: 15 }}>
        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{editId ? "Modifier" : "Ajouter"}</h3>
              {!editId && <button onClick={() => setBatchForms([...batchForms, { date: today(), sport: "Tennis", league: "ATP", subCat: "ML", bet: "", odd: "", stakeE: 60, stakeU: 1, result: "Pending" }])} style={{ background: "#1e293b", color: "#38bdf8", border: "none", padding: "8px 12px", borderRadius: 10, fontWeight: 600, fontSize: 13 }}>+ Ajouter une ligne</button>}
            </div>

            {batchForms.map((f, i) => (
              <div key={i} style={{ background: "#111827", padding: 15, borderRadius: 18, border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="date" value={f.date} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))} style={{ flex: 1.2, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12, fontSize: 14 }} />
                  <select value={f.sport} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, sport: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12, fontSize: 14 }}>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <select value={f.league} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, league: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12 }}>
                    {SPORTS_CONFIG[f.sport].leagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={f.subCat} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, subCat: e.target.value } : x))} style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12 }}>
                    {SPORTS_CONFIG[f.sport].subCats.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>

                <input placeholder="Nom du pari / Détails" value={f.bet} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, bet: e.target.value } : x))} style={{ background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 14, borderRadius: 12, fontSize: 15 }} />

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>COTE</label><input type="number" step="0.01" value={f.odd} onChange={e => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, odd: parseFloat(e.target.value) } : x))} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12, boxSizing: "border-box" }} /></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>UNITÉ (U)</label><input type="number" step="0.1" value={f.stakeU} onChange={e => { const v = parseFloat(e.target.value); setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, stakeU: v, stakeE: v * 60 } : x)); }} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12, boxSizing: "border-box" }} /></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>MISE €</label><input type="number" value={f.stakeE} onChange={e => { const v = parseFloat(e.target.value); setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, stakeE: v, stakeU: v / 60 } : x)); }} style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", padding: 12, borderRadius: 12, boxSizing: "border-box" }} /></div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {RESULTS.map(r => <button key={r} onClick={() => setBatchForms(batchForms.map((x, idx) => idx === i ? { ...x, result: r } : x))} style={{ flex: 1, padding: "10px 5px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "1px solid", borderColor: f.result === r ? RESULT_COLORS[r] : "#334155", background: f.result === r ? RESULT_COLORS[r] + "20" : "#1e293b", color: f.result === r ? RESULT_COLORS[r] : "#94a3b8" }}>{r}</button>)}
                </div>
              </div>
            ))}
            <button onClick={handleSave} style={{ background: "#38bdf8", color: "#0f172a", padding: 18, borderRadius: 15, border: "none", fontWeight: 800, fontSize: 16, marginTop: 5 }}>ENREGISTRER DANS LE CLOUD</button>
          </div>
        )}

        {tab === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bets.map(b => (
              <div key={b.id} style={{ background: "#111827", padding: 15, borderRadius: 18, borderLeft: `6px solid ${RESULT_COLORS[b.result]}`, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{b.date} • {b.sport}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0" }}>{b.bet} <span style={{ color: "#475569", fontSize: 12 }}>({b.subCat})</span></div>
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>@{b.odd} • {b.stakeE}€ <span style={{ fontSize: 11 }}>({b.stakeU}u)</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: RESULT_COLORS[b.result], fontWeight: 900, fontSize: 16 }}>{b.result === "Win" ? "+" + ((b.odd - 1) * b.stakeE).toFixed(2) + "€" : b.result}</div>
                    <div style={{ display: "flex", gap: 15, marginTop: 12, justifyContent: "flex-end" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#111827", padding: 20, borderRadius: 18, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>PROFIT TOTAL</div><div style={{ fontSize: 22, fontWeight: 900, color: stats.profitE >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(stats.profitE)}€</div></div>
            <div style={{ background: "#111827", padding: 20, borderRadius: 18, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>ROI</div><div style={{ fontSize: 22, fontWeight: 900, color: stats.roi >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(stats.roi)}%</div></div>
            <div style={{ background: "#111827", padding: 20, borderRadius: 18, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>PARIS</div><div style={{ fontSize: 22, fontWeight: 900 }}>{stats.count}</div></div>
            <div style={{ background: "#111827", padding: 20, borderRadius: 18, textAlign: "center", border: "1px solid #1e293b" }}><div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>WIN RATE</div><div style={{ fontSize: 22, fontWeight: 900 }}>{stats.wr.toFixed(1)}%</div></div>
          </div>
        )}
      </div>

      {/* BARRE DE NAVIGATION */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0f172a", display: "flex", justifyContent: "space-around", padding: "15px 0 35px", borderTop: "1px solid #1e293b", zIndex: 100 }}>
        <button onClick={() => setTab("add")} style={{ background: "none", border: "none", color: tab === "add" ? "#38bdf8" : "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <Icons.Plus />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Ajouter</span>
        </button>
        <button onClick={() => setTab("list")} style={{ background: "none", border: "none", color: tab === "list" ? "#38bdf8" : "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <Icons.List />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Paris</span>
        </button>
        <button onClick={() => setTab("stats")} style={{ background: "none", border: "none", color: tab === "stats" ? "#38bdf8" : "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <Icons.Chart />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Stats</span>
        </button>
      </nav>
    </div>
  );
}
