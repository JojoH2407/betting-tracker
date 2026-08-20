import React, { useState, useEffect, useMemo } from "react";

// ── THÈME & STYLES ────────────────────────────────────────────────────────────
const T = {
  bg: "#0f172a",
  card: "#1e293b",
  card2: "#334155",
  border: "#334155",
  border2: "#475569",
  text: "#f8fafc",
  text2: "#94a3b8",
  text3: "#64748b",
  accent: "#38bdf8",
  win: "#22c55e",
  lose: "#ef4444",
  pending: "#eab308",
  refund: "#a855f7"
};

const BOOKS = ["Winamax", "Betclic", "Unibet", "PS3838", "PMU", "ParionsSport", "Autre"];
const SPORTS = ["Football", "Tennis", "Basketball", "Baseball", "Boxe", "NFL", "Autre"];
const RESULTS = ["Pending", "Win", "Lose", "Refund", "Half Win", "Half Lose"];

const RESULT_COLORS = {
  Pending: T.pending,
  Win: T.win,
  Lose: T.lose,
  Refund: T.refund,
  "Half Win": T.win,
  "Half Lose": T.lose
};

const bookColor = (book) => {
  switch (book?.toLowerCase()) {
    case "winamax": return { bg: "#e11d48", text: "#ffffff" };
    case "betclic": return { bg: "#dc2626", text: "#ffffff" };
    case "unibet": return { bg: "#16a34a", text: "#ffffff" };
    case "ps3838": return { bg: "#2563eb", text: "#ffffff" };
    default: return { bg: T.card2, text: T.text };
  }
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmt = (n) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const fmtAbs = (n, decimals = 2) => Math.abs(n).toFixed(decimals);
const today = () => new Date().toISOString().split("T")[0];

const calcProfit = (bet, mode = "E") => {
  const stake = mode === "E" ? Number(bet.stakeE ?? bet.stakee ?? 0) : Number(bet.stakeU ?? bet.stakeu ?? 0);
  const odd = Number(bet.odd ?? 1);
  const isFB = bet.isFreebet ?? bet.is_freebet ?? false;

  if (bet.result === "Pending") return 0;
  if (bet.result === "Win") return isFB ? stake * (odd - 1) : stake * (odd - 1);
  if (bet.result === "Lose") return isFB ? 0 : -stake;
  if (bet.result === "Refund") return 0;
  if (bet.result === "Half Win") return isFB ? (stake * (odd - 1)) / 2 : (stake * (odd - 1)) / 2;
  if (bet.result === "Half Lose") return isFB ? 0 : -stake / 2;
  return 0;
};

// ── COMPOSANTS UI SANS DÉPENDANCE EXTERNE ─────────────────────────────────────
const Icons = {
  Edit: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
};

function Input({ label, type = "text", value, onChange, placeholder = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: "uppercase" }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: T.text,
          fontSize: 13,
          outline: "none"
        }}
      />
    </div>
  );
}

function Btn({ children, onClick, bg = T.accent, color = "#fff", style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        color,
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        ...style
      }}
    >
      {children}
    </button>
  );
}

function KPI({ label, value, color = T.text, large = false }) {
  return (
    <div style={{ background: T.card, padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: T.text3, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: large ? 18 : 15, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, color = T.text }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border2}`, fontSize: 12 }}>
      <span style={{ color: T.text2 }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function Sparkline({ data = [] }) {
  if (!data || data.length < 2) {
    return <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: T.text3, fontSize: 11 }}>Pas assez de données pour le graphique</div>;
  }
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${60 - ((v - min) / range) * 50 - 5}`).join(" ");

  return (
    <svg width="100%" height="60" style={{ overflow: "visible" }}>
      <polyline fill="none" stroke={T.accent} strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineChart({ data = [], color = T.accent, emptyMsg = "Aucune donnée" }) {
  if (!data || data.length === 0) {
    return <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: T.text3, fontSize: 11 }}>{emptyMsg}</div>;
  }
  const values = data.map((d) => d.value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${90 - ((v - min) / range) * 80}`).join(" ");

  return (
    <svg width="100%" height="100" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

// ── COMPOSANTS SEMAINE / HISTORIQUE ──────────────────────────────────────────
function WeekGroup({ weekLabel, days, bets, onEdit, onDelete, onUpdateResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>{weekLabel}</div>
      {days.map((day) => {
        const dayBets = bets.filter((b) => b.date === day);
        if (dayBets.length === 0) return null;
        return (
          <div key={day} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>{day}</div>
            {dayBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} onEdit={onEdit} onDelete={onDelete} onUpdateResult={onUpdateResult} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ bets, onEdit, onDelete, onUpdateResult, onDeleteAll, filterMonth, setFilterMonth, allMonths }) {
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const filtered = useMemo(() => {
    if (filterMonth === "all") return bets;
    return bets.filter((b) => b.date?.startsWith(filterMonth));
  }, [bets, filterMonth]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [filtered]);

  const weekEntries = useMemo(() => {
    const groups = {};
    sorted.forEach((b) => {
      const wk = b.date ? b.date.substring(0, 7) : "Sans date";
      if (!groups[wk]) groups[wk] = { dates: new Set(), bets: [] };
      groups[wk].dates.add(b.date);
      groups[wk].bets.push(b);
    });
    return Object.entries(groups);
  }, [sorted]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Filtre par mois */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, padding: "6px 12px", borderRadius: 8, fontSize: 12 }}
        >
          <option value="all">Tous les mois</option>
          {allMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Suppression globale */}
      {showDeleteAll ? (
        <div style={{ background: T.card, padding: 12, borderRadius: 10, border: `1px solid ${T.lose}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.text }}>Supprimer tous les paris filtrés ?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteAll(false)} style={{ flex: 1, background: T.card2, border: "none", borderRadius: 8, padding: 8, color: T.text, fontSize: 12 }}>Annuler</button>
            <button onClick={() => { onDeleteAll(); setShowDeleteAll(false); }} style={{ flex: 1, background: T.lose, border: "none", borderRadius: 8, padding: 8, color: "#fff", fontSize: 12, fontWeight: "bold" }}>Confirmer</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowDeleteAll(true)} style={{ background: "none", border: "none", color: T.lose, fontSize: 11, cursor: "pointer", textAlign: "right", padding: "4px 0" }}>
          Effacer tous les paris
        </button>
      )}

      {/* Liste de paris */}
      {sorted.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 12, padding: "40px 20px", border: `1px solid ${T.border}`, textAlign: "center", color: T.text3, fontSize: 13 }}>
          Aucun pari enregistré.
        </div>
      ) : (
        weekEntries.map(([wk, { dates, bets: wBets }]) => (
          <WeekGroup
            key={wk}
            weekLabel={`Mois / Semaine : ${wk}`}
            days={[...dates].sort((a, b) => b.localeCompare(a))}
            bets={wBets}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateResult={onUpdateResult}
          />
        ))
      )}
    </div>
  );
}

function BetCard({ bet, onEdit, onDelete, onUpdateResult }) {
  const pE = calcProfit(bet, "E");

  return (
    <div style={{ background: T.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase" }}>{bet.sport}</span>
            {bet.league && <span style={{ fontSize: 11, color: T.text3 }}>• {bet.league}</span>}
            {bet.book && (
              <span style={{ fontSize: 9, background: bookColor(bet.book).bg, color: bookColor(bet.book).text, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                {bet.book}
              </span>
            )}
            {bet.isFreebet && <span style={{ fontSize: 9, background: "#7c3aed20", color: "#a855f7", padding: "2px 6px", borderRadius: 4, fontWeight: 700, border: "1px solid #7c3aed40" }}>FREEBET</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{bet.bet}</div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onEdit(bet)} style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 4 }}>
            <Icons.Edit s={16} />
          </button>
          <button onClick={() => onDelete(bet.id)} style={{ background: "none", border: "none", color: T.lose, cursor: "pointer", padding: 4 }}>
            <Icons.Trash s={16} />
          </button>
        </div>
      </div>

      {/* Cote & Mises */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase" }}>Cote</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{Number(bet.odd).toFixed(2)}</div>
          </div>
          <div style={{ width: 1, height: 16, background: T.border }} />
          <div>
            <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase" }}>Mise</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {Number(bet.stakeE ?? 0)}€ <span style={{ fontSize: 10, color: T.text3 }}>({Number(bet.stakeU ?? 0)}u)</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", textAlign: "right" }}>Gain / Perte</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: bet.result === "Pending" ? T.pending : pE >= 0 ? T.win : T.lose, textAlign: "right" }}>
            {bet.result === "Pending" ? "En attente" : `${fmt(pE)}€`}
          </div>
        </div>
      </div>

      {/* Sélecteur de résultat rapide */}
      <div style={{ display: "flex", gap: 4 }}>
        {RESULTS.map((r) => (
          <button
            key={r}
            onClick={() => onUpdateResult(bet, r)}
            style={{
              flex: 1,
              background: bet.result === r ? RESULT_COLORS[r] + "22" : "transparent",
              border: `1px solid ${bet.result === r ? RESULT_COLORS[r] : T.border}`,
              color: bet.result === r ? RESULT_COLORS[r] : T.text3,
              borderRadius: 6,
              padding: "4px 0",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── COMPOSANT STATS TAB ───────────────────────────────────────────────────────
function StatsTab({ total, bySport, byLeague, maxProfitAbs, bkChartData, bankroll, updateBankroll, statsTab, setStatsTab, dailyChartData, oddsRanges, byBook, bookConfig, updateBookConfig }) {
  const [editingBk, setEditingBk] = useState(false);
  const [bkInput, setBkInput] = useState(bankroll.global?.initialBalance ?? 1000);
  const [unitInput, setUnitInput] = useState(bankroll.global?.unitValue ?? 50);
  const [dateInput, setDateInput] = useState(bankroll.global?.initialDate ?? today());

  const [editingBook, setEditingBook] = useState(null);
  const [bookStartInput, setBookStartInput] = useState("");
  const [movType, setMovType] = useState("deposit");
  const [movAmount, setMovAmount] = useState("");
  const [movNote, setMovNote] = useState("");

  const saveBkConfig = () => {
    updateBankroll({
      ...bankroll,
      global: { initialBalance: Number(bkInput), unitValue: Number(unitInput), initialDate: dateInput }
    });
    setEditingBk(false);
  };

  const handleSaveBookStart = (bName) => {
    const cur = bookConfig[bName] ?? { start: 0, movements: [] };
    updateBookConfig({ ...bookConfig, [bName]: { ...cur, start: Number(bookStartInput) } });
    setEditingBook(null);
  };

  const handleAddMovement = (bName) => {
    if (!movAmount || isNaN(movAmount)) return;
    const cur = bookConfig[bName] ?? { start: 0, movements: [] };
    const newMovs = [...(cur.movements ?? []), { date: today(), type: movType, amount: Number(movAmount), note: movNote }];
    updateBookConfig({ ...bookConfig, [bName]: { ...cur, movements: newMovs } });
    setMovAmount("");
    setMovNote("");
  };

  const handleRemoveMovement = (bName, idx) => {
    const cur = bookConfig[bName] ?? { start: 0, movements: [] };
    const newMovs = cur.movements.filter((_, i) => i !== idx);
    updateBookConfig({ ...bookConfig, [bName]: { ...cur, movements: newMovs } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sous-onglets */}
      <div style={{ display: "flex", gap: 6, background: T.card, padding: 4, borderRadius: 10, border: `1px solid ${T.border}` }}>
        {[
          { k: "bk", l: "Bankroll" },
          { k: "perf", l: "Performance" },
          { k: "books", l: "Bookmakers" },
          { k: "sports", l: "Sports" }
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setStatsTab(t.k)}
            style={{
              flex: 1,
              background: statsTab === t.k ? T.card2 : "transparent",
              border: `1px solid ${statsTab === t.k ? T.border2 : "transparent"}`,
              color: statsTab === t.k ? T.accent : T.text2,
              borderRadius: 8,
              padding: "8px 0",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ── BANKROLL TAB ── */}
      {statsTab === "bk" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase" }}>Évolution Bankroll</div>
              <button onClick={() => setEditingBk((e) => !e)} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, cursor: "pointer" }}>
                {editingBk ? "Fermer" : "⚙ Config"}
              </button>
            </div>

            {editingBk && (
              <div style={{ background: T.card2, borderRadius: 10, padding: 12, border: `1px solid ${T.border}`, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Input label="Bankroll Initiale (€)" type="number" value={bkInput} onChange={(e) => setBkInput(e.target.value)} />
                <Input label="Valeur Unité (€)" type="number" value={unitInput} onChange={(e) => setUnitInput(e.target.value)} />
                <Input label="Date Début" type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
                <Btn bg={T.accent} color={T.bg} onClick={saveBkConfig}>Sauvegarder</Btn>
              </div>
            )}

            <Sparkline data={bkChartData} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KPI label="Profit Total (€)" value={`${fmt(total.profitE)}€`} color={total.profitE >= 0 ? T.win : T.lose} large />
            <KPI label="Profit Total (u)" value={`${fmt(total.profitU)}u`} color={total.profitU >= 0 ? T.win : T.lose} large />
            <KPI label="ROI" value={`${fmt(total.roi)}%`} color={total.roi >= 0 ? T.win : T.lose} />
            <KPI label="Taux de Win" value={`${fmtAbs(total.winRate, 1)}%`} color={T.accent} />
          </div>

          <div style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 12 }}>Profit Quotidien Cumulé</div>
            <LineChart data={dailyChartData} color="#38bdf8" emptyMsg="Aucun pari sur la période" />
          </div>
        </div>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {statsTab === "perf" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 12 }}>Vue d'ensemble</div>
            <StatRow label="Paris Totaux" value={total.total} />
            <StatRow label="Paris Tranchés" value={total.settled} />
            <StatRow label="Gagnés" value={total.wins} color={T.win} />
            <StatRow label="Win Rate" value={`${fmtAbs(total.winRate, 1)}%`} />
            <StatRow label="Cote Moyenne" value={fmtAbs(total.avgOdd, 2)} />
            <StatRow label="Mise Moyenne (u)" value={`${fmtAbs(total.avgStakeU, 2)}u`} />
            <StatRow label="Total Investi (€)" value={`${fmtAbs(total.totalInvE, 2)}€`} />
            <StatRow label="ROI" value={`${fmt(total.roi)}%`} color={total.roi >= 0 ? T.win : T.lose} />
          </div>

          <div style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 12 }}>Par tranche de cotes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {oddsRanges.map((r) => (
                <div key={r.label} style={{ background: T.card2, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Cote {r.label}</div>
                    <div style={{ fontSize: 10, color: T.text2 }}>{r.bets} paris • WR: {fmtAbs(r.wr, 1)}%</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: r.profitE >= 0 ? T.win : T.lose }}>{fmt(r.profitE)}€</div>
                    <div style={{ fontSize: 10, color: r.roi >= 0 ? T.win : T.lose }}>ROI {fmt(r.roi)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOOKMAKERS TAB ── */}
      {statsTab === "books" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BOOKS.map((bName) => {
            const bStats = byBook[bName] ?? { bets: [], wins: 0, profitE: 0, totalInvE: 0 };
            const cfg = bookConfig[bName] ?? { start: 0, movements: [] };
            const totalMovs = (cfg.movements ?? []).reduce((a, m) => a + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)), 0);
            const currentBk = (cfg.start ?? 0) + bStats.profitE + totalMovs;
            const isEditing = editingBook === bName;

            return (
              <div key={bName} style={{ background: T.card, borderRadius: 12, padding: 14, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, background: bookColor(bName).bg, color: bookColor(bName).text, padding: "3px 8px", borderRadius: 6, fontWeight: 800 }}>
                      {bName}
                    </span>
                    <span style={{ fontSize: 11, color: T.text3 }}>{bStats.bets.length} paris</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: currentBk >= 0 ? T.text : T.lose }}>{fmtAbs(currentBk)}€</div>
                    <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase" }}>Solde actuel</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (isEditing) setEditingBook(null);
                    else {
                      setEditingBook(bName);
                      setBookStartInput(cfg.start ?? 0);
                    }
                  }}
                  style={{ background: "none", border: "none", color: T.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  {isEditing ? "▲ Masquer la gestion" : "▼ Dépôts, retraits & Solde initial"}
                </button>

                {isEditing && (
                  <div style={{ background: T.card2, borderRadius: 10, padding: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <Input label="Solde initial (€)" type="number" value={bookStartInput} onChange={(e) => setBookStartInput(e.target.value)} />
                      </div>
                      <Btn onClick={() => handleSaveBookStart(bName)} bg={T.accent} color={T.bg}>Sauvegarder</Btn>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setMovType("deposit")} style={{ flex: 1, background: movType === "deposit" ? T.win + "20" : T.card, border: `1px solid ${movType === "deposit" ? T.win : T.border}`, color: movType === "deposit" ? T.win : T.text2, borderRadius: 6, padding: 6, fontSize: 11, fontWeight: 700 }}>+ Dépôt</button>
                      <button onClick={() => setMovType("withdrawal")} style={{ flex: 1, background: movType === "withdrawal" ? T.lose + "20" : T.card, border: `1px solid ${movType === "withdrawal" ? T.lose : T.border}`, color: movType === "withdrawal" ? T.lose : T.text2, borderRadius: 6, padding: 6, fontSize: 11, fontWeight: 700 }}>- Retrait</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
                      <input type="number" placeholder="Montant (€)" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: 8, color: T.text, fontSize: 12 }} />
                      <input placeholder="Note" value={movNote} onChange={(e) => setMovNote(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: 8, color: T.text, fontSize: 12 }} />
                      <Btn onClick={() => handleAddMovement(bName)} bg={T.border2} color={T.text}>Ajouter</Btn>
                    </div>

                    {(cfg.movements ?? []).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {cfg.movements.map((m, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: T.card, padding: "6px 8px", borderRadius: 6, fontSize: 11 }}>
                            <span>{m.type === "deposit" ? "+" : "-"}{m.amount}€ ({m.date})</span>
                            <button onClick={() => handleRemoveMovement(bName, idx)} style={{ background: "none", border: "none", color: T.lose, cursor: "pointer" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── SPORTS TAB ── */}
      {statsTab === "sports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: "uppercase", marginBottom: 12 }}>Bilan par sport</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(bySport).sort(([, a], [, b]) => b.profitE - a.profitE).map(([sport, s]) => {
                const pct = Math.min((Math.abs(s.profitE) / (maxProfitAbs || 1)) * 100, 100);
                const isPos = s.profitE >= 0;
                return (
                  <div key={sport} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{sport} <span style={{ fontSize: 10, color: T.text3 }}>({s.bets.length} paris)</span></span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isPos ? T.win : T.lose }}>{fmt(s.profitE)}€</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: T.card2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: isPos ? T.win : T.lose, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPOSANT PRINCIPAL (APP) ─────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("history");
  const [statsTab, setStatsTab] = useState("bk");

  const [bets, setBets] = useState(() => {
    const saved = localStorage.getItem("bet_tracker_bets");
    return saved ? JSON.parse(saved) : [
      { id: "1", date: today(), sport: "Tennis", league: "ATP US Open", bet: "Alcaraz Gagne", odd: 1.85, stakeE: 50, stakeU: 1, book: "Winamax", result: "Win", isFreebet: false },
      { id: "2", date: today(), sport: "Football", league: "Ligue 1", bet: "PSG -1.5", odd: 2.10, stakeE: 50, stakeU: 1, book: "Betclic", result: "Lose", isFreebet: false }
    ];
  });

  const [bankroll, setBankroll] = useState(() => {
    const saved = localStorage.getItem("bet_tracker_bankroll");
    return saved ? JSON.parse(saved) : { global: { initialBalance: 1000, unitValue: 50, initialDate: "2026-01-01" } };
  });

  const [bookConfig, setBookConfig] = useState(() => {
    const saved = localStorage.getItem("bet_tracker_books");
    return saved ? JSON.parse(saved) : {};
  });

  const [filterMonth, setFilterMonth] = useState("all");
  const [editingBet, setEditingBet] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire d'ajout / édition
  const [formBet, setFormBet] = useState({
    date: today(),
    sport: "Football",
    league: "",
    bet: "",
    odd: "2.00",
    stakeU: "1",
    book: "Winamax",
    result: "Pending",
    isFreebet: false
  });

  useEffect(() => {
    localStorage.setItem("bet_tracker_bets", JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    localStorage.setItem("bet_tracker_bankroll", JSON.stringify(bankroll));
  }, [bankroll]);

  useEffect(() => {
    localStorage.setItem("bet_tracker_books", JSON.stringify(bookConfig));
  }, [bookConfig]);

  const allMonths = useMemo(() => {
    const setM = new Set(bets.map((b) => b.date?.substring(0, 7)).filter(Boolean));
    return [...setM].sort((a, b) => b.localeCompare(a));
  }, [bets]);

  // Calculs de statistiques
  const stats = useMemo(() => {
    const unitVal = bankroll.global?.unitValue || 50;
    let settled = 0, wins = 0, profitE = 0, profitU = 0, totalInvE = 0, sumOdd = 0;

    const bySport = {};
    const byLeague = {};
    const byBook = {};

    bets.forEach((b) => {
      const pE = calcProfit(b, "E");
      const pU = calcProfit(b, "U");
      const stE = Number(b.stakeE || b.stakeU * unitVal || 0);

      // Bookmakers
      if (!byBook[b.book]) byBook[b.book] = { bets: [], wins: 0, profitE: 0, totalInvE: 0 };
      byBook[b.book].bets.push(b);

      // Sports
      if (!bySport[b.sport]) bySport[b.sport] = { bets: [], wins: 0, profitE: 0 };
      bySport[b.sport].bets.push(b);

      // Leagues
      if (b.league) {
        if (!byLeague[b.league]) byLeague[b.league] = { bets: [], wins: 0, profitE: 0, profitU: 0 };
        byLeague[b.league].bets.push(b);
      }

      if (b.result !== "Pending") {
        settled++;
        profitE += pE;
        profitU += pU;
        totalInvE += stE;
        sumOdd += Number(b.odd);

        byBook[b.book].profitE += pE;
        byBook[b.book].totalInvE += stE;
        bySport[b.sport].profitE += pE;

        if (b.league) {
          byLeague[b.league].profitE += pE;
          byLeague[b.league].profitU += pU;
        }

        if (b.result === "Win" || b.result === "Half Win") {
          wins++;
          byBook[b.book].wins++;
          bySport[b.sport].wins++;
          if (b.league) byLeague[b.league].wins++;
        }
      }
    });

    const maxProfitAbs = Math.max(...Object.values(bySport).map((s) => Math.abs(s.profitE)), 1);

    return {
      total: {
        total: bets.length,
        settled,
        wins,
        winRate: settled ? (wins / settled) * 100 : 0,
        profitE,
        profitU,
        totalInvE,
        avgOdd: settled ? sumOdd / settled : 0,
        avgStakeU: settled ? totalInvE / unitVal / settled : 0,
        roi: totalInvE ? (profitE / totalInvE) * 100 : 0
      },
      bySport,
      byLeague,
      byBook,
      maxProfitAbs
    };
  }, [bets, bankroll]);

  // Données du graphique d'évolution bankroll
  const bkChartData = useMemo(() => {
    const initial = bankroll.global?.initialBalance || 1000;
    const sorted = [...bets].filter((b) => b.result !== "Pending").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let current = initial;
    const pts = [{ date: bankroll.global?.initialDate || "Début", value: initial }];

    sorted.forEach((b) => {
      current += calcProfit(b, "E");
      pts.push({ date: b.date, value: current });
    });

    return pts;
  }, [bets, bankroll]);

  // Données de profit quotidien
  const dailyChartData = useMemo(() => {
    const sorted = [...bets].filter((b) => b.result !== "Pending").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let cum = 0;
    return sorted.map((b) => {
      cum += calcProfit(b, "E");
      return { date: b.date, value: cum };
    });
  }, [bets]);

  // Tranches de cotes
  const oddsRanges = useMemo(() => {
    const ranges = [
      { label: "< 1.50", min: 0, max: 1.5 },
      { label: "1.50 - 2.00", min: 1.5, max: 2.0 },
      { label: "2.00 - 3.00", min: 2.0, max: 3.0 },
      { label: "> 3.00", min: 3.0, max: 999 }
    ];

    return ranges.map((r) => {
      const match = bets.filter((b) => b.result !== "Pending" && Number(b.odd) >= r.min && Number(b.odd) < r.max);
      const wins = match.filter((b) => b.result === "Win" || b.result === "Half Win").length;
      const profitE = match.reduce((a, b) => a + calcProfit(b, "E"), 0);
      const totalInv = match.reduce((a, b) => a + Number(b.stakeE || b.stakeU * (bankroll.global?.unitValue || 50)), 0);

      return {
        label: r.label,
        bets: match.length,
        wr: match.length ? (wins / match.length) * 100 : 0,
        profitE,
        roi: totalInv ? (profitE / totalInv) * 100 : 0
      };
    });
  }, [bets, bankroll]);

  // Actions Paris
  const handleSaveBet = () => {
    const unitVal = bankroll.global?.unitValue || 50;
    const stU = Number(formBet.stakeU);
    const newBetObj = {
      ...formBet,
      id: editingBet ? editingBet.id : Date.now().toString(),
      odd: Number(formBet.odd),
      stakeU: stU,
      stakeE: stU * unitVal
    };

    if (editingBet) {
      setBets((prev) => prev.map((b) => (b.id === editingBet.id ? newBetObj : b)));
    } else {
      setBets((prev) => [newBetObj, ...prev]);
    }

    setShowAddModal(false);
    setEditingBet(null);
  };

  const handleEdit = (bet) => {
    setEditingBet(bet);
    setFormBet({
      date: bet.date,
      sport: bet.sport,
      league: bet.league || "",
      bet: bet.bet,
      odd: bet.odd.toString(),
      stakeU: (bet.stakeU || 1).toString(),
      book: bet.book,
      result: bet.result,
      isFreebet: bet.isFreebet || false
    });
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateResult = (bet, result) => {
    setBets((prev) => prev.map((b) => (b.id === bet.id ? { ...b, result } : b)));
  };

  const handleDeleteAll = () => {
    if (filterMonth === "all") setBets([]);
    else setBets((prev) => prev.filter((b) => !b.date?.startsWith(filterMonth)));
  };

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {/* Top Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.accent, letterSpacing: 0.5 }}>BANKROLL TRACKER</span>
        <Btn bg={T.accent} color={T.bg} onClick={() => { setEditingBet(null); setShowAddModal(true); }}>+ Ajouter un Pari</Btn>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
        {activeTab === "history" && (
          <HistoryTab
            bets={bets}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateResult={handleUpdateResult}
            onDeleteAll={handleDeleteAll}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            allMonths={allMonths}
          />
        )}

        {activeTab === "stats" && (
          <StatsTab
            total={stats.total}
            bySport={stats.bySport}
            byLeague={stats.byLeague}
            byBook={stats.byBook}
            maxProfitAbs={stats.maxProfitAbs}
            bkChartData={bkChartData}
            bankroll={bankroll}
            updateBankroll={setBankroll}
            statsTab={statsTab}
            setStatsTab={setStatsTab}
            dailyChartData={dailyChartData}
            oddsRanges={oddsRanges}
            bookConfig={bookConfig}
            updateBookConfig={setBookConfig}
          />
        )}
      </div>

      {/* Modal Ajout / Édition */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 20, width: "100%", maxWidth: 450, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{editingBet ? "Éditer le Pari" : "Nouveau Pari"}</span>

            <Input label="Date" type="date" value={formBet.date} onChange={(e) => setFormBet({ ...formBet, date: e.target.value })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: "uppercase" }}>Sport</label>
                <select value={formBet.sport} onChange={(e) => setFormBet({ ...formBet, sport: e.target.value })} style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, color: T.text, padding: 8, borderRadius: 8 }}>
                  {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: "uppercase" }}>Bookmaker</label>
                <select value={formBet.book} onChange={(e) => setFormBet({ ...formBet, book: e.target.value })} style={{ width: "100%", background: T.card2, border: `1px solid ${T.border}`, color: T.text, padding: 8, borderRadius: 8 }}>
                  {BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <Input label="Compétition / Ligue" placeholder="ex: Champions League" value={formBet.league} onChange={(e) => setFormBet({ ...formBet, league: e.target.value })} />
            <Input label="Intitulé du Pari" placeholder="ex: Real Madrid Gagne" value={formBet.bet} onChange={(e) => setFormBet({ ...formBet, bet: e.target.value })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Cote" type="number" value={formBet.odd} onChange={(e) => setFormBet({ ...formBet, odd: e.target.value })} />
              <Input label="Mise (Unités)" type="number" value={formBet.stakeU} onChange={(e) => setFormBet({ ...formBet, stakeU: e.target.value })} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="fb" checked={formBet.isFreebet} onChange={(e) => setFormBet({ ...formBet, isFreebet: e.target.checked })} />
              <label htmlFor="fb" style={{ fontSize: 12, color: T.text2 }}>Pari placé en Freebet</label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Btn bg={T.card2} color={T.text} onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Annuler</Btn>
              <Btn bg={T.accent} color={T.bg} onClick={handleSaveBet} style={{ flex: 1 }}>Enregistrer</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bas de Page */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0" }}>
        <button onClick={() => setActiveTab("history")} style={{ background: "none", border: "none", color: activeTab === "history" ? T.accent : T.text3, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📜 Historique
        </button>
        <button onClick={() => setActiveTab("stats")} style={{ background: "none", border: "none", color: activeTab === "stats" ? T.accent : T.text3, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📊 Statistiques
        </button>
      </div>
    </div>
  );
}
