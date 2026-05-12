import { useState, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const SPORTS = ["Tennis", "NBA", "MLB", "Football", "eSport", "OT"];
const CATEGORIES = {
  Tennis: ["WTA", "ATP", "Europa", "Parlay"],
  NBA: ["ML", "Spread", "O/U", "Parlay"],
  MLB: ["ML", "Spread", "O/U", "Total Bases", "HR", "Parlay"],
  Football: ["ML", "DNB", "AH", "O/U", "BTTS", "Parlay"],
  eSport: ["ML", "Map", "Parlay"],
  OT: ["ML", "Autre"],
};
const RESULTS = ["En cours", "Win", "Lose", "Void"];

const COLORS = {
  Win: "#22c55e",
  Lose: "#ef4444",
  Void: "#94a3b8",
  "En cours": "#f59e0b",
};

const fmt = (n, decimals = 2) =>
  n === undefined || n === null || isNaN(n)
    ? "–"
    : (n >= 0 ? "+" : "") + Number(n).toFixed(decimals);

const fmtAbs = (n, decimals = 2) =>
  n === undefined || n === null || isNaN(n)
    ? "–"
    : Number(n).toFixed(decimals);

const today = () => new Date().toISOString().slice(0, 10);

const MONTH_NAMES = [
  "Jan","Fév","Mar","Avr","Mai","Jun",
  "Jul","Aoû","Sep","Oct","Nov","Déc",
];

const monthKey = (dateStr) => dateStr?.slice(0, 7) ?? "";
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

// ── storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "bets_v1";
const loadBets = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveBets = (bets) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));

const BK_KEY = "bankroll_v1";
const loadBankroll = () => {
  try {
    return JSON.parse(localStorage.getItem(BK_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveBankroll = (bk) =>
  localStorage.setItem(BK_KEY, JSON.stringify(bk));

// ── icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
const ChartIcon = () => <Icon d="M3 3v18h18M7 16l4-4 4 4 4-8" />;
const ListIcon = () => <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
const TrashIcon = ({ size }) => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={size} />;
const EditIcon = ({ size }) => <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={size} />;
const BankIcon = () => <Icon d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />;

// ── mini bar chart component ──────────────────────────────────────────────────
const MiniBar = ({ value, max, color }) => {
  const pct = max === 0 ? 0 : Math.abs(value / max) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        flex: 1, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden"
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 3,
          transition: "width .4s ease"
        }} />
      </div>
    </div>
  );
};

// ── sparkline ─────────────────────────────────────────────────────────────────
const Sparkline = ({ data, width = 300, height = 80 }) => {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.bk);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 10;
  const W = width - pad * 2;
  const H = height - pad * 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * W;
    const y = pad + H - ((d.bk - min) / range) * H;
    return `${x},${y}`;
  });
  const last = pts[pts.length - 1];
  const [lx, ly] = last.split(",").map(Number);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ")}
        fill="none" stroke="#38bdf8" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r={4} fill="#38bdf8" />
      {data.map((d, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={d.profit >= 0 ? "#22c55e" : "#ef4444"} opacity={0.7} />
          </g>
        );
      })}
    </svg>
  );
};

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("add");
  const [bets, setBets] = useState(loadBets);
  const [bankroll, setBankrollState] = useState(loadBankroll);
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // form state
  const emptyForm = {
    date: today(), sport: "Tennis", category: "WTA",
    bet: "", odd: "", stakeE: 60, stakeU: 1, result: "En cours", note: ""
  };
  const [form, setForm] = useState(emptyForm);

  const updateBets = (next) => { setBets(next); saveBets(next); };
  const updateBankroll = (next) => { setBankrollState(next); saveBankroll(next); };

  const handleForm = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "sport") next.category = CATEGORIES[v][0];
      return next;
    });
  };

  const handleSubmit = () => {
    if (!form.bet || !form.odd) return;
    if (editId !== null) {
      updateBets(bets.map((b) => (b.id === editId ? { ...form, id: editId } : b)));
      setEditId(null);
    } else {
      const newBet = { ...form, id: Date.now() };
      updateBets([...bets, newBet]);
    }
    setForm(emptyForm);
    setTab("list");
  };

  const startEdit = (bet) => {
    setForm({ ...bet });
    setEditId(bet.id);
    setTab("add");
  };

  const deleteBet = (id) => {
    updateBets(bets.filter((b) => b.id !== id));
    setShowDeleteConfirm(null);
  };

  // ── computed stats ────────────────────────────────────────────────────────
  const allMonths = useMemo(() => {
    const s = new Set(bets.map((b) => monthKey(b.date)));
    return [...s].sort();
  }, [bets]);

  const filteredBets = useMemo(() => {
    if (filterMonth === "all") return bets;
    return bets.filter((b) => monthKey(b.date) === filterMonth);
  }, [bets, filterMonth]);

  const statsBySport = useMemo(() => {
    const map = {};
    filteredBets.forEach((b) => {
      if (!map[b.sport]) map[b.sport] = { bets: [], wins: 0, totalInvE: 0, totalInvU: 0, profitE: 0, profitU: 0, odds: [] };
      const s = map[b.sport];
      s.bets.push(b);
      if (b.result === "Win") {
        s.wins++;
        s.profitE += (b.odd - 1) * b.stakeE;
        s.profitU += (b.odd - 1) * b.stakeU;
      } else if (b.result === "Lose") {
        s.profitE -= b.stakeE;
        s.profitU -= b.stakeU;
      }
      if (b.result !== "Void" && b.result !== "En cours") {
        s.totalInvE += Number(b.stakeE);
        s.totalInvU += Number(b.stakeU);
      }
      s.odds.push(Number(b.odd));
    });
    return map;
  }, [filteredBets]);

  const totalStats = useMemo(() => {
    let wins = 0, settled = 0, profitE = 0, profitU = 0, totalInvE = 0;
    filteredBets.forEach((b) => {
      if (b.result === "Win") { wins++; profitE += (b.odd - 1) * b.stakeE; profitU += (b.odd - 1) * b.stakeU; }
      else if (b.result === "Lose") { profitE -= b.stakeE; profitU -= b.stakeU; }
      if (b.result !== "Void" && b.result !== "En cours") { settled++; totalInvE += Number(b.stakeE); }
    });
    return {
      total: filteredBets.length, wins, settled,
      winRate: settled ? (wins / settled) * 100 : 0,
      profitE, profitU,
      roi: totalInvE ? (profitE / totalInvE) * 100 : 0,
    };
  }, [filteredBets]);

  // bankroll chart data
  const bkChartData = useMemo(() => {
    return allMonths.map((mk) => {
      const bkVal = bankroll[mk]?.end ?? bankroll[mk]?.start ?? null;
      const monthBets = bets.filter((b) => monthKey(b.date) === mk);
      let profit = 0;
      monthBets.forEach((b) => {
        if (b.result === "Win") profit += (b.odd - 1) * b.stakeE;
        else if (b.result === "Lose") profit -= b.stakeE;
      });
      return { label: monthLabel(mk), bk: bkVal ?? 0, profit, mk };
    });
  }, [allMonths, bets, bankroll]);

  // max absolute profit for bar scaling
  const maxProfitAbs = useMemo(() => {
    const vals = Object.values(statsBySport).map((s) => Math.abs(s.profitE));
    return Math.max(...vals, 1);
  }, [statsBySport]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 80,
    }}>
      {/* header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "20px 20px 16px",
        borderBottom: "1px solid #1e293b",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#38bdf8", textTransform: "uppercase", marginBottom: 2 }}>
          BET TRACKER
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc" }}>
          {filterMonth === "all" ? "Vue Globale" : monthLabel(filterMonth)}
        </div>
        {/* month filter pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 12, paddingBottom: 4 }}>
          <button onClick={() => setFilterMonth("all")} style={pillStyle(filterMonth === "all")}>Tout</button>
          {allMonths.map((mk) => (
            <button key={mk} onClick={() => setFilterMonth(mk)} style={pillStyle(filterMonth === mk)}>
              {monthLabel(mk)}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div style={{ padding: "16px 16px 0" }}>
        {tab === "add" && <AddTab form={form} handleForm={handleForm} handleSubmit={handleSubmit} editId={editId} setEditId={setEditId} setForm={setForm} emptyForm={emptyForm} setTab={setTab} />}
        {tab === "list" && <ListTab bets={filteredBets} onEdit={startEdit} onDelete={(id) => setShowDeleteConfirm(id)} />}
        {tab === "dashboard" && <DashTab statsBySport={statsBySport} totalStats={totalStats} maxProfitAbs={maxProfitAbs} bkChartData={bkChartData} bankroll={bankroll} updateBankroll={updateBankroll} allMonths={allMonths} />}
      </div>

      {/* bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#0f172a",
        borderTop: "1px solid #1e293b",
        display: "flex", justifyContent: "space-around", padding: "10px 0 20px",
        zIndex: 20,
      }}>
        {[
          { key: "add", label: editId ? "Modifier" : "Saisir", icon: <PlusIcon /> },
          { key: "list", label: "Paris", icon: <ListIcon /> },
          { key: "dashboard", label: "Stats", icon: <ChartIcon /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            color: tab === key ? "#38bdf8" : "#475569",
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
            transition: "color .2s",
          }}>
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* delete modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#1e293b", borderRadius: 16, padding: 24, margin: 20,
            border: "1px solid #334155", maxWidth: 320, width: "100%",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Supprimer ce pari ?</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>Cette action est irréversible.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ ...btnStyle("#334155"), flex: 1 }}>Annuler</button>
              <button onClick={() => deleteBet(showDeleteConfirm)} style={{ ...btnStyle("#ef4444"), flex: 1 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AddTab ────────────────────────────────────────────────────────────────────
function AddTab({ form, handleForm, handleSubmit, editId, setEditId, setForm, emptyForm, setTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={sectionTitle}>{editId ? "✏️ Modifier le pari" : "➕ Nouveau pari"}</div>

      <Row label="Date">
        <input type="date" value={form.date} onChange={(e) => handleForm("date", e.target.value)} style={inputStyle} />
      </Row>

      <Row label="Sport">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SPORTS.map((s) => (
            <button key={s} onClick={() => handleForm("sport", s)}
              style={chipStyle(form.sport === s)}>{s}</button>
          ))}
        </div>
      </Row>

      <Row label="Catégorie">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES[form.sport].map((c) => (
            <button key={c} onClick={() => handleForm("category", c)}
              style={chipStyle(form.category === c)}>{c}</button>
          ))}
        </div>
      </Row>

      <Row label="Paris">
        <input placeholder="Ex: Djokovic vs Alcaraz ML" value={form.bet}
          onChange={(e) => handleForm("bet", e.target.value)} style={inputStyle} />
      </Row>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={labelStyle}>Cote</div>
          <input type="number" step="0.01" placeholder="2.10" value={form.odd}
            onChange={(e) => handleForm("odd", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Mise €</div>
          <input type="number" value={form.stakeE}
            onChange={(e) => handleForm("stakeE", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Mise u</div>
          <input type="number" step="0.25" value={form.stakeU}
            onChange={(e) => handleForm("stakeU", e.target.value)} style={inputStyle} />
        </div>
      </div>

      <Row label="Résultat">
        <div style={{ display: "flex", gap: 8 }}>
          {RESULTS.map((r) => (
            <button key={r} onClick={() => handleForm("result", r)}
              style={{
                ...chipStyle(form.result === r),
                ...(form.result === r ? { background: COLORS[r] + "33", borderColor: COLORS[r], color: COLORS[r] } : {}),
                fontSize: 12, padding: "6px 10px",
              }}>{r}</button>
          ))}
        </div>
      </Row>

      <Row label="Note (optionnel)">
        <input placeholder="Analyse, contexte..." value={form.note}
          onChange={(e) => handleForm("note", e.target.value)} style={inputStyle} />
      </Row>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {editId && (
          <button onClick={() => { setEditId(null); setForm(emptyForm); setTab("list"); }}
            style={{ ...btnStyle("#334155"), flex: 1 }}>Annuler</button>
        )}
        <button onClick={handleSubmit}
          style={{ ...btnStyle("#38bdf8"), flex: 2, color: "#0a0f1e", fontWeight: 700 }}>
          {editId ? "Mettre à jour" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ── ListTab ───────────────────────────────────────────────────────────────────
function ListTab({ bets, onEdit, onDelete }) {
  const sorted = [...bets].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) return (
    <div style={{ textAlign: "center", color: "#475569", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
      <div>Aucun pari pour cette période</div>
    </div>
  );

  // group by date
  const groups = {};
  sorted.forEach((b) => {
    if (!groups[b.date]) groups[b.date] = [];
    groups[b.date].push(b);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(groups).map(([date, dayBets]) => (
        <div key={date}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            {new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
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
  const profitE = bet.result === "Win" ? (bet.odd - 1) * bet.stakeE
    : bet.result === "Lose" ? -bet.stakeE : 0;

  return (
    <div style={{
      background: "#111827",
      borderRadius: 12,
      padding: "12px 14px",
      border: `1px solid ${COLORS[bet.result]}33`,
      position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ ...tag, background: "#1e293b" }}>{bet.sport}</span>
            <span style={{ ...tag, background: "#1e293b", color: "#94a3b8" }}>{bet.category}</span>
            <span style={{
              ...tag,
              background: COLORS[bet.result] + "22",
              color: COLORS[bet.result],
              border: `1px solid ${COLORS[bet.result]}44`,
            }}>{bet.result}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>{bet.bet}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}>
            <span>@{Number(bet.odd).toFixed(2)}</span>
            <span>{bet.stakeE}€ / {bet.stakeU}u</span>
          </div>
          {bet.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>{bet.note}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {bet.result !== "En cours" && bet.result !== "Void" && (
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: profitE >= 0 ? "#22c55e" : "#ef4444",
            }}>{fmt(profitE)}€</div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
            <button onClick={() => onEdit(bet)} style={{
              background: "#1e293b", border: "none", borderRadius: 8, padding: "6px",
              cursor: "pointer", color: "#94a3b8", display: "flex",
            }}><EditIcon size={14} /></button>
            <button onClick={() => onDelete(bet.id)} style={{
              background: "#1e293b", border: "none", borderRadius: 8, padding: "6px",
              cursor: "pointer", color: "#ef444499", display: "flex",
            }}><TrashIcon size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DashTab ───────────────────────────────────────────────────────────────────
function DashTab({ statsBySport, totalStats, maxProfitAbs, bkChartData, bankroll, updateBankroll, allMonths }) {
  const [bkEdit, setBkEdit] = useState(null);
  const [bkForm, setBkForm] = useState({ start: "", end: "", fees: "" });

  const openBkEdit = (mk) => {
    setBkEdit(mk);
    setBkForm({
      start: bankroll[mk]?.start ?? "",
      end: bankroll[mk]?.end ?? "",
      fees: bankroll[mk]?.fees ?? "",
    });
  };
  const saveBk = () => {
    updateBankroll({ ...bankroll, [bkEdit]: { start: Number(bkForm.start), end: Number(bkForm.end), fees: Number(bkForm.fees) } });
    setBkEdit(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <KPI label="Paris" value={totalStats.total} />
        <KPI label="Win Rate" value={fmtAbs(totalStats.winRate) + "%"} color={totalStats.winRate >= 50 ? "#22c55e" : "#ef4444"} />
        <KPI label="ROI" value={fmt(totalStats.roi) + "%"} color={totalStats.roi >= 0 ? "#22c55e" : "#ef4444"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KPI label="Profit €" value={fmt(totalStats.profitE) + "€"} color={totalStats.profitE >= 0 ? "#22c55e" : "#ef4444"} large />
        <KPI label="Profit u" value={fmt(totalStats.profitU) + "u"} color={totalStats.profitU >= 0 ? "#22c55e" : "#ef4444"} large />
      </div>

      {/* par sport */}
      <div>
        <div style={sectionTitle}>Par sport</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(statsBySport).map(([sport, s]) => {
            const settled = s.bets.filter((b) => b.result !== "Void" && b.result !== "En cours").length;
            const wr = settled ? (s.wins / settled) * 100 : 0;
            return (
              <div key={sport} style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sport}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.profitE >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmt(s.profitE)}€
                  </div>
                </div>
                <MiniBar value={s.profitE} max={maxProfitAbs} color={s.profitE >= 0 ? "#22c55e" : "#ef4444"} />
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  <span>{s.bets.length} paris</span>
                  <span>{fmtAbs(wr)}% WR</span>
                  <span>{fmt(s.profitU)}u</span>
                </div>
              </div>
            );
          })}
          {Object.keys(statsBySport).length === 0 && (
            <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>Aucune donnée</div>
          )}
        </div>
      </div>

      {/* bankroll chart */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={sectionTitle}>Évolution Bankroll</div>
        </div>
        <div style={{ background: "#111827", borderRadius: 12, padding: 14, border: "1px solid #1e293b" }}>
          {bkChartData.length >= 2
            ? <Sparkline data={bkChartData} />
            : <div style={{ color: "#475569", textAlign: "center", padding: 20, fontSize: 13 }}>
                Renseigne la bankroll ci-dessous pour voir le graphe
              </div>
          }
          {bkChartData.length > 0 && (
            <div style={{ display: "flex", overflowX: "auto", gap: 6, marginTop: 10, paddingBottom: 4 }}>
              {bkChartData.map((d) => (
                <div key={d.mk} style={{ textAlign: "center", flexShrink: 0, width: 56 }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{d.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.bk > 0 ? "#e2e8f0" : "#475569" }}>
                    {d.bk > 0 ? d.bk.toLocaleString() : "–"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* bankroll mensuelle */}
      <div>
        <div style={sectionTitle}>
          <BankIcon /> Bankroll mensuelle
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allMonths.map((mk) => {
            const bk = bankroll[mk] ?? {};
            return (
              <div key={mk} style={{ background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600 }}>{monthLabel(mk)}</div>
                  <button onClick={() => openBkEdit(mk)} style={{
                    background: "#1e293b", border: "none", borderRadius: 8, padding: "4px 10px",
                    color: "#38bdf8", fontSize: 12, cursor: "pointer"
                  }}>Éditer</button>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  <span>Début: <b style={{ color: "#e2e8f0" }}>{bk.start ? bk.start.toLocaleString() + "€" : "–"}</b></span>
                  <span>Fin: <b style={{ color: "#e2e8f0" }}>{bk.end ? bk.end.toLocaleString() + "€" : "–"}</b></span>
                  <span>Frais: <b style={{ color: "#ef4444" }}>{bk.fees ? "-" + bk.fees + "€" : "–"}</b></span>
                </div>
              </div>
            );
          })}
          {allMonths.length === 0 && (
            <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>Aucun mois enregistré</div>
          )}
        </div>
      </div>

      {/* bankroll edit modal */}
      {bkEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, margin: 20, border: "1px solid #334155", maxWidth: 320, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Bankroll — {monthLabel(bkEdit)}</div>
            {[["start", "Bankroll début (€)"], ["end", "Bankroll fin (€)"], ["fees", "Frais PS3838 (€)"]].map(([k, lbl]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={labelStyle}>{lbl}</div>
                <input type="number" value={bkForm[k]} onChange={(e) => setBkForm((f) => ({ ...f, [k]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setBkEdit(null)} style={{ ...btnStyle("#334155"), flex: 1 }}>Annuler</button>
              <button onClick={saveBk} style={{ ...btnStyle("#38bdf8"), flex: 1, color: "#0a0f1e", fontWeight: 700 }}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, color, large }) {
  return (
    <div style={{
      background: "#111827", borderRadius: 12, padding: large ? "14px 16px" : "12px 14px",
      border: "1px solid #1e293b", textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 22 : 18, fontWeight: 800, color: color ?? "#f8fafc" }}>{value}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 };
const sectionTitle = { fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 };
const inputStyle = {
  width: "100%", background: "#1e293b", border: "1px solid #334155",
  borderRadius: 10, padding: "10px 12px", color: "#f8fafc", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
const chipStyle = (active) => ({
  background: active ? "#38bdf822" : "#1e293b",
  border: `1px solid ${active ? "#38bdf8" : "#334155"}`,
  color: active ? "#38bdf8" : "#94a3b8",
  borderRadius: 20, padding: "5px 12px", fontSize: 13, cursor: "pointer",
  whiteSpace: "nowrap", transition: "all .15s",
});
const pillStyle = (active) => ({
  background: active ? "#38bdf8" : "#1e293b",
  border: "none",
  color: active ? "#0a0f1e" : "#94a3b8",
  borderRadius: 20, padding: "4px 12px", fontSize: 12, cursor: "pointer",
  whiteSpace: "nowrap", fontWeight: active ? 700 : 400,
});
const btnStyle = (bg) => ({
  background: bg, border: "none", borderRadius: 12, padding: "14px 16px",
  color: "#f8fafc", fontSize: 15, cursor: "pointer", fontWeight: 600,
});
const tag = { fontSize: 11, borderRadius: 6, padding: "2px 8px", color: "#94a3b8" };
