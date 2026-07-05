import { useState, useEffect, useCallback } from "react";
import { getAllTradeInRequests, appraiseTradeIn, rejectTradeIn } from "../../services/tradeInService";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", cream: "#FAF7F2", error: "#C47B5A", green: "#6B7C5C", gold: "#D4A843" };

const STATUS_CFG = {
    pending: { label: "Chờ định giá", color: C.gold, bg: "#FEF9EC" },
    appraised: { label: "Đã định giá", color: "#4285F4", bg: "#EBF2FE" },
    voucher_sent: { label: "Đã gửi ưu đãi", color: C.green, bg: "#EEF4EA" },
    rejected: { label: "Từ chối", color: C.error, bg: "#FBF0ED" },
    cancelled: { label: "Đã huỷ", color: "#999", bg: "#F5F5F5" },
};

const CONDITION_LABELS = { like_new: "Như mới", good: "Tốt", fair: "Khá", poor: "Cũ, có hư hỏng" };

export default function AdminTradeIn() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState("");
    const [detail, setDetail] = useState(null);
    const [appraiseModal, setAppraiseModal] = useState(null);
    const [appraisedValue, setAppraisedValue] = useState("");
    const [adminNote, setAdminNote] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const d = await getAllTradeInRequests({ status: statusTab || undefined });
        setRequests(d.requests || []);
        setLoading(false);
    }, [statusTab]);

    useEffect(() => { load(); }, [load]);

    const handleAppraise = async () => {
        if (!appraisedValue || Number(appraisedValue) <= 0) return alert("Vui lòng nhập giá trị định giá hợp lệ");
        setSaving(true);
        try {
            await appraiseTradeIn(appraiseModal._id, { appraisedValue: Number(appraisedValue), adminNote });
            setAppraiseModal(null);
            setAppraisedValue(""); setAdminNote("");
            load();
        } catch (err) { alert(err.message); }
        setSaving(false);
    };

    const handleReject = async (id) => {
        const note = prompt("Lý do từ chối (tuỳ chọn):") || "";
        try {
            await rejectTradeIn(id, note);
            load();
        } catch (err) { alert(err.message); }
    };

    return (
        <div style={{ padding: "32px 40px", background: C.cream, minHeight: "100vh" }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>Thu cũ đổi mới</h1>
                <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Tổng: {requests.length} yêu cầu</p>
            </div>

            <div style={{ display: "flex", borderBottom: `1px solid ${C.sand}`, marginBottom: 24, overflowX: "auto" }}>
                {[{ value: "", label: "Tất cả" }, ...Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label }))].map(tab => (
                    <button key={tab.value} onClick={() => setStatusTab(tab.value)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "'Poppins', sans-serif", color: statusTab === tab.value ? C.wood : "#888", fontWeight: statusTab === tab.value ? 600 : 400, borderBottom: `2px solid ${statusTab === tab.value ? C.wood : "transparent"}`, whiteSpace: "nowrap" }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <p style={{ color: "#bbb", fontSize: 14 }}>Đang tải...</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                    {requests.length === 0 ? (
                        <p style={{ color: "#bbb", fontSize: 14 }}>Không có yêu cầu nào</p>
                    ) : requests.map(r => {
                        const cfg = STATUS_CFG[r.status] || {};
                        return (
                            <div key={r._id} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, overflow: "hidden" }}>
                                <div style={{ display: "flex", gap: 4, height: 140 }}>
                                    {(r.images || []).slice(0, 3).map((img, i) => (
                                        <img key={i} src={img} alt="" style={{ flex: 1, height: "100%", objectFit: "cover", cursor: "pointer" }} onClick={() => setDetail(r)} />
                                    ))}
                                </div>
                                <div style={{ padding: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                        <p style={{ margin: 0, fontWeight: 700, color: C.dark, fontSize: 14 }}>{r.productName}</p>
                                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>{cfg.label}</span>
                                    </div>
                                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#999" }}>{r.category} · {CONDITION_LABELS[r.condition]}</p>
                                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#666" }}>{r.user?.fullName} · {r.contactPhone}</p>
                                    {r.appraisedValue && (
                                        <p style={{ margin: "0 0 4px", fontSize: 13, color: C.green, fontWeight: 600 }}>{r.appraisedValue.toLocaleString("vi-VN")}₫ {r.voucherCode && `— ${r.voucherCode}`}</p>
                                    )}
                                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                                        <button onClick={() => setDetail(r)} style={S.btnGhost}>Chi tiết</button>
                                        {r.status === "pending" && (
                                            <>
                                                <button onClick={() => setAppraiseModal(r)} style={{ ...S.btnGhost, background: "#EBF2FE", color: "#4285F4", borderColor: "#4285F4" }}>Định giá</button>
                                                <button onClick={() => handleReject(r._id)} style={{ ...S.btnGhost, background: "#FBF0ED", color: C.error, borderColor: C.error }}>Từ chối</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal chi tiết */}
            {detail && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
                    <div style={{ background: "#fff", borderRadius: 10, padding: 24, width: 480, maxHeight: "85vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.dark, margin: 0 }}>{detail.productName}</h3>
                            <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                            {(detail.images || []).map((img, i) => (
                                <img key={i} src={img} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6 }} />
                            ))}
                        </div>
                        <p style={S.detailRow}><b>Danh mục:</b> {detail.category}</p>
                        <p style={S.detailRow}><b>Tình trạng:</b> {CONDITION_LABELS[detail.condition]}</p>
                        <p style={S.detailRow}><b>Mô tả:</b> {detail.description || "—"}</p>
                        <p style={S.detailRow}><b>Khách hàng:</b> {detail.user?.fullName} ({detail.user?.email})</p>
                        <p style={S.detailRow}><b>Liên hệ:</b> {detail.contactPhone} {detail.contactAddress && `— ${detail.contactAddress}`}</p>
                        {detail.appraisedValue && <p style={S.detailRow}><b>Định giá:</b> {detail.appraisedValue.toLocaleString("vi-VN")}₫</p>}
                        {detail.voucherCode && <p style={S.detailRow}><b>Voucher:</b> {detail.voucherCode}</p>}
                        {detail.adminNote && <p style={S.detailRow}><b>Ghi chú admin:</b> {detail.adminNote}</p>}
                    </div>
                </div>
            )}

            {/* Modal định giá */}
            {appraiseModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", borderRadius: 10, padding: 24, width: 420 }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.dark, margin: "0 0 16px" }}>
                            Định giá: {appraiseModal.productName}
                        </h3>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: "block", marginBottom: 6 }}>Giá trị định giá (₫) *</label>
                            <input type="number" min="0" value={appraisedValue} onChange={e => setAppraisedValue(e.target.value)} placeholder="VD: 500000"
                                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                            <p style={{ fontSize: 11, color: "#999", margin: "6px 0 0" }}>
                                Hệ thống sẽ tự tạo voucher giảm giá cố định đúng số tiền này, hiệu lực 90 ngày, dùng 1 lần.
                            </p>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: "block", marginBottom: 6 }}>Ghi chú (tuỳ chọn)</label>
                            <textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, resize: "none", boxSizing: "border-box" }} />
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setAppraiseModal(null)} style={{ flex: 1, background: C.beige, border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13, cursor: "pointer" }}>Huỷ</button>
                            <button onClick={handleAppraise} disabled={saving} style={{ flex: 1, background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                                {saving ? "Đang gửi..." : "Gửi ưu đãi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    btnGhost: { fontSize: 11, padding: "5px 10px", borderRadius: 4, border: `1px solid ${C.sand}`, background: "none", cursor: "pointer", color: "#666", fontFamily: "'Poppins', sans-serif" },
    detailRow: { fontSize: 13, color: "#555", margin: "0 0 8px", lineHeight: 1.6 },
};