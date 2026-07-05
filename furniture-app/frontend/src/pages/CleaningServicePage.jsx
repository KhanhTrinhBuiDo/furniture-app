import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import { getEligibleOrders, createCleaningRequest, getMyCleaningRequests, cancelCleaningRequest } from "../services/cleaningService";
import FadeUp from "../components/FadeUp";

const C = { cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E", wood: "#B8860B", sand: "#D9C9B0", green: "#6B7C5C", error: "#C47B5A", gold: "#D4A843" };

const STATUS_CFG = {
    pending: { label: "Chờ xác nhận", color: C.gold, bg: "#FEF9EC" },
    confirmed: { label: "Đã xác nhận lịch", color: "#4285F4", bg: "#EBF2FE" },
    in_progress: { label: "Đang thực hiện", color: C.wood, bg: "#F5EDE3" },
    completed: { label: "Hoàn tất", color: C.green, bg: "#EEF4EA" },
    cancelled: { label: "Đã huỷ", color: C.error, bg: "#FBF0ED" },
};

export default function CleaningServicePage() {
    const { showToast } = useStore();
    const [orders, setOrders] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        orderCode: "", selectedItems: [], preferredDate: "", address: "", phone: "", notes: "",
    });

    const load = async () => {
        setLoading(true);
        try {
            const [o, r] = await Promise.all([getEligibleOrders(), getMyCleaningRequests()]);
            setOrders(o.orders || []);
            setMyRequests(r.requests || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const selectedOrder = orders.find(o => o.orderCode === form.orderCode);

    const toggleItem = (item) => {
        setForm(f => {
            const exists = f.selectedItems.find(i => i.name === item.name);
            return {
                ...f,
                selectedItems: exists
                    ? f.selectedItems.filter(i => i.name !== item.name)
                    : [...f.selectedItems, { name: item.name, img: item.img, product: item.product }],
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.orderCode || !form.selectedItems.length || !form.preferredDate || !form.address || !form.phone) {
            showToast({ message: "Vui lòng điền đầy đủ thông tin", type: "error" });
            return;
        }
        setSubmitting(true);
        try {
            await createCleaningRequest(form);
            showToast({ message: "Đăng ký vệ sinh thành công! Chờ Admin xác nhận lịch hẹn.", type: "success" });
            setForm({ orderCode: "", selectedItems: [], preferredDate: "", address: "", phone: "", notes: "" });
            load();
        } catch (err) {
            showToast({ message: err.message, type: "error" });
        }
        setSubmitting(false);
    };

    const handleCancel = async (id) => {
        if (!confirm("Xác nhận huỷ đăng ký này?")) return;
        try {
            await cancelCleaningRequest(id);
            showToast({ message: "Đã huỷ đăng ký", type: "info" });
            load();
        } catch (err) { showToast({ message: err.message, type: "error" }); }
    };

    return (
        <div style={{ background: C.cream, minHeight: "100vh" }}>
            <div style={{ background: C.beige, padding: "40px 20px", textAlign: "center" }}>
                <FadeUp>
                    <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", color: C.dark, margin: 0 }}>
                        Vệ sinh miễn phí sản phẩm bọc da / nệm
                    </h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 8, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
                        Áp dụng cho đơn hàng đã giao thành công. Đăng ký lịch hẹn, đội ngũ Amore Home sẽ liên hệ xác nhận.
                    </p>
                </FadeUp>
            </div>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 40 }}>

                {/* FORM ĐĂNG KÝ */}
                <FadeUp>
                    <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 10, padding: 28, border: `1px solid ${C.sand}` }}>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 20px" }}>Đăng ký mới</h3>

                        {loading ? <p style={{ color: "#999", fontSize: 13 }}>Đang tải đơn hàng...</p> : orders.length === 0 ? (
                            <p style={{ color: "#999", fontSize: 13 }}>Bạn chưa có đơn hàng nào đã giao thành công để đăng ký dịch vụ này.</p>
                        ) : (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={styles.label}>Chọn đơn hàng *</label>
                                    <select value={form.orderCode} onChange={e => setForm(f => ({ ...f, orderCode: e.target.value, selectedItems: [] }))} style={styles.input}>
                                        <option value="">-- Chọn đơn hàng --</option>
                                        {orders.map(o => (
                                            <option key={o.orderCode} value={o.orderCode}>
                                                {o.orderCode} — {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedOrder && (
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={styles.label}>Chọn sản phẩm cần vệ sinh *</label>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {selectedOrder.items.map((item, i) => (
                                                <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `1px solid ${C.sand}`, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                                                    <input type="checkbox" checked={!!form.selectedItems.find(x => x.name === item.name)} onChange={() => toggleItem(item)} style={{ accentColor: C.wood }} />
                                                    {item.img && <img src={item.img} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />}
                                                    {item.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <label style={styles.label}>Ngày hẹn mong muốn *</label>
                                        <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} style={styles.input} />
                                    </div>
                                    <div>
                                        <label style={styles.label}>Số điện thoại *</label>
                                        <input type="tel" placeholder="0912345678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={styles.input} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={styles.label}>Địa chỉ *</label>
                                    <input type="text" placeholder="Địa chỉ thực hiện vệ sinh" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={styles.input} />
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={styles.label}>Ghi chú</label>
                                    <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...styles.input, resize: "none" }} />
                                </div>

                                <button type="submit" disabled={submitting} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? "Đang gửi..." : "Đăng ký vệ sinh"}
                                </button>
                            </>
                        )}
                    </form>
                </FadeUp>

                {/* DANH SÁCH ĐĂNG KÝ */}
                {myRequests.length > 0 && (
                    <FadeUp>
                        <div>
                            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 16px" }}>Lịch sử đăng ký</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {myRequests.map(r => {
                                    const cfg = STATUS_CFG[r.status] || {};
                                    return (
                                        <div key={r._id} style={{ background: "#fff", borderRadius: 8, padding: 18, border: `1px solid ${C.sand}` }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 600, color: C.dark, fontSize: 14 }}>Đơn hàng: {r.orderCode}</p>
                                                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>
                                                        {r.items.map(i => i.name).join(", ")}
                                                    </p>
                                                </div>
                                                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cfg.bg, color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#666" }}>
                                                Ngày hẹn mong muốn: {new Date(r.preferredDate).toLocaleDateString("vi-VN")}
                                                {r.scheduledDate && ` — Đã xác nhận: ${new Date(r.scheduledDate).toLocaleDateString("vi-VN")}`}
                                            </p>
                                            {r.adminNote && <p style={{ margin: "0 0 4px", fontSize: 12, color: "#999", fontStyle: "italic" }}>Ghi chú từ Admin: {r.adminNote}</p>}
                                            {["pending", "confirmed"].includes(r.status) && (
                                                <button onClick={() => handleCancel(r._id)} style={{ marginTop: 8, background: "none", border: `1px solid ${C.error}`, color: C.error, borderRadius: 4, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>
                                                    Huỷ đăng ký
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </FadeUp>
                )}
            </div>
        </div>
    );
}

const styles = {
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#4A2C1A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
    input: { width: "100%", padding: "10px 12px", border: `1px solid ${C.sand}`, borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none", boxSizing: "border-box" },
};