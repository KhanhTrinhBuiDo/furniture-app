import { useState, useEffect, useCallback } from "react";
import { getAllCleaningRequests, updateCleaningStatus } from "../../services/cleaningService";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", cream: "#FAF7F2", error: "#C47B5A", green: "#6B7C5C", gold: "#D4A843" };

const STATUS_CFG = {
    pending: { label: "Chờ xác nhận", color: C.gold, bg: "#FEF9EC", next: ["confirmed", "cancelled"] },
    confirmed: { label: "Đã xác nhận lịch", color: "#4285F4", bg: "#EBF2FE", next: ["in_progress", "cancelled"] },
    in_progress: { label: "Đang thực hiện", color: C.wood, bg: "#F5EDE3", next: ["completed"] },
    completed: { label: "Hoàn tất", color: C.green, bg: "#EEF4EA", next: [] },
    cancelled: { label: "Đã huỷ", color: C.error, bg: "#FBF0ED", next: [] },
};

export default function AdminCleaning() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState("");
    const [modal, setModal] = useState(null); // { request, nextStatus }
    const [scheduledDate, setScheduledDate] = useState("");
    const [adminNote, setAdminNote] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const d = await getAllCleaningRequests({ status: statusTab || undefined });
        setRequests(d.requests || []);
        setLoading(false);
    }, [statusTab]);

    useEffect(() => { load(); }, [load]);

    const openModal = (request, nextStatus) => {
        setModal({ request, nextStatus });
        setScheduledDate(request.scheduledDate ? request.scheduledDate.slice(0, 10) : "");
        setAdminNote("");
    };

    const confirmUpdate = async () => {
        setSaving(true);
        try {
            await updateCleaningStatus(modal.request._id, {
                status: modal.nextStatus,
                scheduledDate: scheduledDate || undefined,
                adminNote,
            });
            setModal(null);
            load();
        } catch (err) {
            alert(err.message);
        }
        setSaving(false);
    };

    return (
        <div style={{ padding: "32px 40px", background: C.cream, minHeight: "100vh" }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>Đăng ký vệ sinh miễn phí</h1>
                <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Tổng: {requests.length} đăng ký</p>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {requests.length === 0 ? (
                        <p style={{ color: "#bbb", fontSize: 14 }}>Không có đăng ký nào</p>
                    ) : requests.map(r => {
                        const cfg = STATUS_CFG[r.status] || {};
                        return (
                            <div key={r._id} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, padding: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: C.dark, fontSize: 14 }}>{r.user?.fullName} — {r.orderCode}</p>
                                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>{r.user?.email} · {r.phone}</p>
                                    </div>
                                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                                </div>
                                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>Sản phẩm: {r.items.map(i => i.name).join(", ")}</p>
                                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>Địa chỉ: {r.address}</p>
                                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>
                                    Ngày mong muốn: {new Date(r.preferredDate).toLocaleDateString("vi-VN")}
                                    {r.scheduledDate && ` — Đã xác nhận: ${new Date(r.scheduledDate).toLocaleDateString("vi-VN")}`}
                                </p>
                                {r.notes && <p style={{ margin: "0 0 4px", fontSize: 12, color: "#999", fontStyle: "italic" }}>Ghi chú khách: {r.notes}</p>}
                                {r.adminNote && <p style={{ margin: "0 0 4px", fontSize: 12, color: C.wood }}>Ghi chú admin: {r.adminNote}</p>}

                                {(cfg.next || []).length > 0 && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                        {cfg.next.map(next => (
                                            <button key={next} onClick={() => openModal(r, next)}
                                                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: `1px solid ${STATUS_CFG[next]?.color}`, background: STATUS_CFG[next]?.bg, color: STATUS_CFG[next]?.color, cursor: "pointer", fontWeight: 600 }}>
                                                → {STATUS_CFG[next]?.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal xác nhận */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", borderRadius: 10, padding: 24, width: 420 }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.dark, margin: "0 0 16px" }}>
                            Chuyển sang: {STATUS_CFG[modal.nextStatus]?.label}
                        </h3>

                        {modal.nextStatus === "confirmed" && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: "block", marginBottom: 6 }}>Ngày hẹn xác nhận</label>
                                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                            </div>
                        )}

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: "block", marginBottom: 6 }}>Ghi chú (tuỳ chọn)</label>
                            <textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, resize: "none", boxSizing: "border-box" }} />
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setModal(null)} style={{ flex: 1, background: C.beige, border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13, cursor: "pointer" }}>Huỷ</button>
                            <button onClick={confirmUpdate} disabled={saving} style={{ flex: 1, background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                                {saving ? "Đang lưu..." : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}