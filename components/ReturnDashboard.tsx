"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  ArrivalStatus,
  DecisionStatus,
  Profile,
  ReturnLog,
  ReturnRecord,
} from "@/lib/types";

interface ReturnDashboardProps {
  profile: Profile;
}

const arrivalLabels: Record<ArrivalStatus, string> = {
  bekliyor: "Bekleniyor",
  geldi: "Geldi",
  gelmedi: "Gelmedi",
};

const decisionLabels: Record<DecisionStatus, string> = {
  bekliyor: "Kontrol Bekliyor",
  onay: "Onaylandı",
  red: "Reddedildi",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function ReturnDashboard({ profile }: ReturnDashboardProps) {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState<ArrivalStatus | "tumu">("tumu");
  const [decisionFilter, setDecisionFilter] = useState<DecisionStatus | "tumu">("bekliyor");
  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<ReturnLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadReturns = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("returns")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("İadeler yüklenemedi: " + loadError.message);
    } else {
      const returnRows = (data || []) as Array<ReturnRecord & { created_by: string; received_by: string | null; checked_by: string | null; logo_entered_by: string | null }>;
      const profileIds = [...new Set(
        returnRows.flatMap((item) => [item.created_by, item.received_by, item.checked_by, item.logo_entered_by].filter(Boolean)),
      )];
      const { data: profiles, error: profilesError } = profileIds.length
        ? await supabase.from("profiles").select("id, full_name, username").in("id", profileIds)
        : { data: [], error: null };

      if (profilesError) {
        setError("Kullanıcı bilgileri yüklenemedi: " + profilesError.message);
      }

      const profileMap = new Map(
        ((profiles || []) as Array<Pick<Profile, "id" | "full_name" | "username">>).map((profile) => [profile.id, profile]),
      );
      setReturns(returnRows.map((item) => ({
        ...item,
        creator: profileMap.get(item.created_by) || null,
        receiver: item.received_by ? profileMap.get(item.received_by) || null : null,
        checker: item.checked_by ? profileMap.get(item.checked_by) || null : null,
        logoEnterer: item.logo_entered_by ? profileMap.get(item.logo_entered_by) || null : null,
      })) as ReturnRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadReturns();
    }, 0);

    const channel = supabase
      .channel("returns-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "returns" },
        () => void loadReturns(),
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoad);
      void supabase.removeChannel(channel);
    };
  }, [loadReturns]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filteredReturns = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("tr-TR");

    return returns.filter((item) => {
      const matchesSearch =
        !normalized ||
        item.customer_name.toLocaleLowerCase("tr-TR").includes(normalized) ||
        item.product_name.toLocaleLowerCase("tr-TR").includes(normalized);
      const matchesArrival = arrivalFilter === "tumu" || item.arrival_status === arrivalFilter;
      const matchesDecision = decisionFilter === "tumu" || item.decision_status === decisionFilter;
      return matchesSearch && matchesArrival && matchesDecision;
    });
  }, [returns, search, arrivalFilter, decisionFilter]);

  const stats = useMemo(
    () => ({
      total: returns.length,
      waiting: returns.filter((item) => item.arrival_status === "bekliyor").length,
      arrived: returns.filter((item) => item.arrival_status === "geldi").length,
      approved: returns.filter((item) => item.decision_status === "onay").length,
      rejected: returns.filter((item) => item.decision_status === "red").length,
      logoPending: returns.filter((item) => item.decision_status === "onay" && !item.logo_entered).length,
    }),
    [returns],
  );

  async function updateArrival(id: string, status: ArrivalStatus) {
    setError("");
    const { error: updateError } = await supabase
      .from("returns")
      .update({ arrival_status: status })
      .eq("id", id);

    if (updateError) setError("Geliş durumu güncellenemedi: " + updateError.message);
    else {
      setMessage(`Geliş durumu “${arrivalLabels[status]}” olarak güncellendi.`);
      await loadReturns();
    }
  }

  async function updateDecision(id: string, status: DecisionStatus) {
    setError("");
    const { error: updateError } = await supabase
      .from("returns")
      .update({ decision_status: status })
      .eq("id", id);

    if (updateError) setError("Kontrol sonucu güncellenemedi: " + updateError.message);
    else {
      setMessage(
        status === "onay"
          ? "İade onaylandı ve Onaylananlar görünümüne taşındı."
          : `Kontrol sonucu “${decisionLabels[status]}” olarak güncellendi.`,
      );
      await loadReturns();
    }
  }

  async function updateLogoEntered(id: string, entered: boolean) {
    setError("");
    const { error: updateError } = await supabase
      .from("returns")
      .update({ logo_entered: entered })
      .eq("id", id);

    if (updateError) setError("Logo girişi güncellenemedi: " + updateError.message);
    else {
      setMessage(entered ? "Logo'ya giriş yapıldı olarak işaretlendi." : "Logo girişi yapılmadı olarak işaretlendi.");
      await loadReturns();
    }
  }

  async function saveNote(id: string) {
    setError("");
    const { error: updateError } = await supabase
      .from("returns")
      .update({ notes: noteDraft.trim() || null })
      .eq("id", id);

    if (updateError) setError("Not kaydedilemedi: " + updateError.message);
    else {
      setEditingNoteId(null);
      setMessage("İade notu kaydedildi.");
      await loadReturns();
    }
  }

  async function deleteReturn(id: string) {
    const confirmed = window.confirm("Bu iade kaydı kalıcı olarak silinsin mi?");
    if (!confirmed) return;

    setError("");
    const { error: deleteError } = await supabase.from("returns").delete().eq("id", id);

    if (deleteError) setError("Kayıt silinemedi: " + deleteError.message);
    else {
      setMessage("İade kaydı silindi.");
      await loadReturns();
    }
  }

  async function showHistory(returnId: string) {
    if (historyId === returnId) {
      setHistoryId(null);
      setHistory([]);
      return;
    }

    setHistoryId(returnId);
    setHistoryLoading(true);
    const { data, error: historyError } = await supabase
      .from("return_logs")
      .select("id, return_id, action, created_at, changed_by")
      .eq("return_id", returnId)
      .order("created_at", { ascending: false });

    if (historyError) {
      setError("İşlem geçmişi yüklenemedi: " + historyError.message);
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const logRows = (data || []) as ReturnLog[];
    const profileIds = [...new Set(logRows.map((log) => log.changed_by).filter(Boolean))];
    const { data: profiles } = profileIds.length
      ? await supabase.from("profiles").select("id, full_name, username").in("id", profileIds)
      : { data: [] };
    const profileMap = new Map(
      ((profiles || []) as Array<Pick<Profile, "id" | "full_name" | "username">>).map((profile) => [profile.id, profile]),
    );
    setHistory(logRows.map((log) => ({
      ...log,
      changer: log.changed_by ? profileMap.get(log.changed_by) || null : null,
    })));
    setHistoryLoading(false);
  }

  function exportCsv() {
    const rows = [
      [
        "Müşteri",
        "Ürün",
        "Adet",
        "Geliş Durumu",
        "Kontrol Sonucu",
        "İadeyi Giren",
        "Teslim Alan",
        "Kontrol Eden",
        "Logo Girişi",
        "Logo'ya Giren",
        "Not",
        "Kayıt Tarihi",
      ],
      ...filteredReturns.map((item) => [
        item.customer_name,
        item.product_name,
        item.quantity,
        arrivalLabels[item.arrival_status],
        decisionLabels[item.decision_status],
        item.creator?.full_name || item.creator?.username || "",
        item.receiver?.full_name || item.receiver?.username || "",
        item.checker?.full_name || item.checker?.username || "",
        item.logo_entered ? "Yapıldı" : "Yapılmadı",
        item.logoEnterer?.full_name || item.logoEnterer?.username || "",
        item.notes || "",
        formatDate(item.created_at),
      ]),
    ];

    const content = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iade-listesi-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">HEKA OPERASYON</p>
          <h1>İade Takip Sistemi</h1>
        </div>
        <div className="user-area">
          <div className="user-chip">
            <strong>{profile.full_name}</strong>
            <span>{profile.role === "admin" ? "Yönetici" : "Operasyon"}</span>
          </div>
          <button className="button ghost" onClick={() => void supabase.auth.signOut()}>
            Çıkış
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="İade özeti">
        <StatCard label="Toplam İade" value={stats.total} />
        <StatCard label="Kargo Bekleniyor" value={stats.waiting} />
        <StatCard label="Teslim Geldi" value={stats.arrived} />
        <StatCard label="Onaylandı" value={stats.approved} />
        <StatCard label="Reddedildi" value={stats.rejected} />
        <StatCard label="Logo Girişi Bekleyen" value={stats.logoPending} />
      </section>

      <section className="toolbar panel">
        <div className="filters">
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Müşteri veya ürün ara…"
              aria-label="Müşteri veya ürün ara"
            />
            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={arrivalFilter}
            onChange={(event) => setArrivalFilter(event.target.value as ArrivalStatus | "tumu")}
            aria-label="Geliş durumuna göre filtrele"
          >
            <option value="tumu">Tüm geliş durumları</option>
            <option value="bekliyor">Bekleniyor</option>
            <option value="geldi">Geldi</option>
            <option value="gelmedi">Gelmedi</option>
          </select>
          <select
            value={decisionFilter}
            onChange={(event) => setDecisionFilter(event.target.value as DecisionStatus | "tumu")}
            aria-label="Kontrol sonucuna göre filtrele"
          >
            <option value="bekliyor">Kontrol bekleyenler</option>
            <option value="onay">Onaylananlar</option>
            <option value="red">Reddedilenler</option>
            <option value="tumu">Tüm kontrol sonuçları</option>
          </select>
        </div>
        <div className="toolbar-actions">
          <button className="button secondary" onClick={exportCsv}>CSV Aktar</button>
          <button className="button primary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Formu Kapat" : "+ Yeni İade"}
          </button>
        </div>
      </section>

      {showForm && (
        <NewReturnForm
          profile={profile}
          onCreated={async () => {
            setShowForm(false);
            setMessage("Yeni iade kaydı oluşturuldu.");
            await loadReturns();
          }}
          onError={setError}
        />
      )}

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="return-section">
        <div className="section-heading">
          <h2>
            {decisionFilter === "bekliyor"
              ? "Kontrol Bekleyen İadeler"
              : decisionFilter === "onay"
                ? "Onaylanan İadeler"
                : decisionFilter === "red"
                  ? "Reddedilen İadeler"
                  : "İade Kayıtları"}
          </h2>
          <span>{filteredReturns.length} kayıt gösteriliyor</span>
        </div>

        {loading ? (
          <div className="empty-state">Kayıtlar yükleniyor…</div>
        ) : filteredReturns.length === 0 ? (
          <div className="empty-state">
            <strong>Kayıt bulunamadı.</strong>
            <span>Filtreleri temizleyin veya yeni bir iade ekleyin.</span>
          </div>
        ) : (
          <div className="return-list">
            {filteredReturns.map((item) => (
              <article className="return-card" key={item.id}>
                <div className="return-main">
                  <div className="return-title-row">
                    <div>
                      <h3>{item.customer_name}</h3>
                      <p>{item.product_name}</p>
                    </div>
                    <div className="quantity">{item.quantity} adet</div>
                  </div>

                  <div className="status-row">
                    <span className={`status arrival-${item.arrival_status}`}>{arrivalLabels[item.arrival_status]}</span>
                    <span className={`status decision-${item.decision_status}`}>{decisionLabels[item.decision_status]}</span>
                    {item.decision_status === "onay" && (
                      <span className={`status ${item.logo_entered ? "decision-onay" : "decision-bekliyor"}`}>
                        {item.logo_entered ? "Logo'ya Girildi" : "Logo Girişi Bekliyor"}
                      </span>
                    )}
                  </div>

                  <dl className="meta-grid">
                    <div>
                      <dt>İadeyi giren</dt>
                      <dd>{item.creator?.full_name || item.creator?.username || "—"}</dd>
                    </div>
                    <div>
                      <dt>Teslim alan</dt>
                      <dd>{item.receiver?.full_name || item.receiver?.username || "—"}</dd>
                    </div>
                    <div>
                      <dt>Kontrol eden</dt>
                      <dd>{item.checker?.full_name || item.checker?.username || "—"}</dd>
                    </div>
                    <div>
                      <dt>Kayıt tarihi</dt>
                      <dd>{formatDate(item.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Logo kaydı</dt>
                      <dd className={item.decision_status === "onay" ? "logo-meta-value" : "logo-meta-value muted-value"}>
                        {item.decision_status === "onay"
                          ? item.logo_entered
                            ? "Yapıldı"
                            : "Yapılmadı"
                          : "Onay sonrası aktif"}
                      </dd>
                    </div>
                    <div>
                      <dt>Logo&apos;ya giren / tarih</dt>
                      <dd>
                        {item.decision_status === "onay" && item.logo_entered
                          ? `${item.logoEnterer?.full_name || item.logoEnterer?.username || "Sistem"} · ${formatDate(item.logo_entered_at)}`
                          : "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="note-box">
                    <div>
                      <strong>Not</strong>
                      {editingNoteId === item.id ? (
                        <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} />
                      ) : (
                        <p>{item.notes || "Not eklenmemiş."}</p>
                      )}
                    </div>
                    {editingNoteId === item.id ? (
                      <div className="inline-actions">
                        <button className="button small primary" onClick={() => void saveNote(item.id)}>Kaydet</button>
                        <button className="button small ghost" onClick={() => setEditingNoteId(null)}>Vazgeç</button>
                      </div>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setNoteDraft(item.notes || "");
                        }}
                      >
                        Notu düzenle
                      </button>
                    )}
                  </div>
                </div>

                <aside className="return-actions">
                  <div className="action-group">
                    <span className="action-label">1. Kargo durumu</span>
                    <div className="segmented">
                      {(["bekliyor", "geldi", "gelmedi"] as ArrivalStatus[]).map((status) => (
                        <button
                          className={item.arrival_status === status ? "active" : ""}
                          key={status}
                          onClick={() => void updateArrival(item.id, status)}
                        >
                          {arrivalLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="action-group">
                    <span className="action-label">2. Kontrol sonucu</span>
                    <div className="decision-buttons">
                      <button
                        className={`button approve ${item.decision_status === "onay" ? "selected" : ""}`}
                        disabled={item.arrival_status !== "geldi"}
                        onClick={() => void updateDecision(item.id, "onay")}
                      >
                        Onayla
                      </button>
                      <button
                        className={`button reject ${item.decision_status === "red" ? "selected" : ""}`}
                        disabled={item.arrival_status !== "geldi"}
                        onClick={() => void updateDecision(item.id, "red")}
                      >
                        Reddet
                      </button>
                      {item.decision_status !== "bekliyor" && (
                        <button className="button ghost small" onClick={() => void updateDecision(item.id, "bekliyor")}>
                          Kararı sıfırla
                        </button>
                      )}
                    </div>
                    {item.arrival_status !== "geldi" && <small>Kontrol kararı için önce “Geldi” seçilmelidir.</small>}
                  </div>

                  <div className="action-group">
                    <span className="action-label">3. Logo girişi</span>
                    <div className="segmented logo-segmented">
                      <button
                        className={!item.logo_entered ? "active" : ""}
                        disabled={item.decision_status !== "onay"}
                        onClick={() => void updateLogoEntered(item.id, false)}
                      >
                        Yapılmadı
                      </button>
                      <button
                        className={item.logo_entered ? "active" : ""}
                        disabled={item.decision_status !== "onay"}
                        onClick={() => void updateLogoEntered(item.id, true)}
                      >
                        Yapıldı
                      </button>
                    </div>
                    {item.decision_status !== "onay" && <small>Logo girişi için önce iade onaylanmalıdır.</small>}
                  </div>

                  <div className="card-footer-actions">
                    <button className="text-button" onClick={() => void showHistory(item.id)}>İşlem geçmişi</button>
                    {profile.role === "admin" && (
                      <button className="text-button danger" onClick={() => void deleteReturn(item.id)}>Kaydı sil</button>
                    )}
                  </div>
                </aside>

                {historyId === item.id && (
                  <div className="history-panel">
                    <strong>İşlem Geçmişi</strong>
                    {historyLoading ? (
                      <p>Yükleniyor…</p>
                    ) : history.length === 0 ? (
                      <p>İşlem kaydı bulunamadı.</p>
                    ) : (
                      <ul>
                        {history.map((log) => (
                          <li key={log.id}>
                            <span>{log.action}</span>
                            <small>{log.changer?.full_name || log.changer?.username || "Sistem"} · {formatDate(log.created_at)}</small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NewReturnForm({
  profile,
  onCreated,
  onError,
}: {
  profile: Profile;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    onError("");

    const { error } = await supabase.from("returns").insert({
      customer_name: customerName.trim(),
      product_name: productName.trim(),
      quantity,
      notes: notes.trim() || null,
      created_by: profile.id,
    });

    if (error) {
      onError("İade kaydı oluşturulamadı: " + error.message);
      setSubmitting(false);
      return;
    }

    await onCreated();
  }

  return (
    <section className="panel new-return-panel">
      <div className="section-heading">
        <div>
          <h2>Yeni İade Girişi</h2>
          <span>Kargo henüz gelmediyse sistem otomatik olarak “Bekleniyor” durumunda açar.</span>
        </div>
      </div>
      <form className="new-return-form" onSubmit={handleSubmit}>
        <label>
          Müşteri adı
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
        </label>
        <label>
          Ürün
          <input value={productName} onChange={(event) => setProductName(event.target.value)} required />
        </label>
        <label>
          Adet
          <input
            type="number"
            min={1}
            max={9999}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            required
          />
        </label>
        <label className="form-wide">
          Not <span className="optional">(opsiyonel)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </label>
        <div className="form-wide form-submit">
          <button className="button primary" disabled={submitting} type="submit">
            {submitting ? "Kaydediliyor…" : "İade Kaydını Oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}
