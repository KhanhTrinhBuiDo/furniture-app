import { useState, useEffect } from "react";
import { useStore } from "../../../store/store";
import { createTradeInRequest, getMyTradeInRequests, cancelTradeInRequest } from "../services/tradeInService";
import FadeUp from "../components/FadeUp";

const C = { cream: "#FAF7F2", beige: "#F0E8DC", dark: "#1A1A2E", wood: "#B8860B", sand: "#D9C9B0", green: "#6B7C5C", error: "#C47B5A", gold: "#D4A843" };

const CATEGORIES = ["LIVING ROOM", "KITCHEN", "BEDROOM", "BATHROOM", "DECORATION", "DINING ROOM"];
const CONDITIONS = [
    { value: "like_new", label: "Như mới" },
    { value: "good", label: "Tốt" },
    { value: "fair", label: "Khá" },
    { value: "poor", label: "Cũ, có hư hỏng" },
];

const STATUS_CFG = {
    pending: { label: "Chờ định giá", color: C.gold, bg: "#FEF9EC" },
    appraised: { label: "Đã định giá", color: "#4285F4", bg: "#EBF2FE" },
    voucher_sent: { label: "Đã gửi ưu đãi", color: C.green, bg: "#EEF4EA" },
    rejected: { label: "Từ chối", color: C.error, bg: "#FBF0ED" },
    cancelled: { label: "Đã huỷ", color: "#999", bg: "#F5F5F5" },
};

export default function TradeInPage() {
    const { showToast } = useStore();
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        productName: "", category: "", description: "", condition: "", contactPhone: "", contactAddress: "",
    });
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);

    const load = async () => {
        setLoading(true);
        try {
            const r = await getMyTradeInRequests();
            setMyRequests(r.requests || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleFiles = (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        setImages(files);
        setPreviews(files.map(f => URL.createObjectURL(f)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.productName || !form.category || !form.condition || !form.contactPhone || !images.length) {
            showToast({ message: "Vui lòng điền đầy đủ thông tin và gửi ít nhất 1 ảnh", type: "error" });
            return;
        }
        setSubmitting(true);
        try {
            await createTradeInRequest({ ...form, images });
            showToast({ message: "Đã gửi yêu cầu! Amore Home sẽ định giá và gửi ưu đãi qua tài khoản của bạn.", type: "success" });
            setForm({ productName: "", category: "", description: "", condition: "", contactPhone: "", contactAddress: "" });
            setImages([]); setPreviews([]);
            load();
        } catch (err) {
            showToast({ message: err.message, type: "error" });
        }
        setSubmitting(false);
    };

    const handleCancel = async (id) => {
        if (!confirm("Xác nhận huỷ yêu cầu này?")) return;
        try {
            await cancelTradeInRequest(id);
            showToast({ message: "Đã huỷ yêu cầu", type: "info" });
            load();
        } catch (err) { showToast({ message: err.message, type: "error" }); }
    };

    return (
        <div style={{ background: C.cream, minHeight: "100vh" }}>
            <div style={{ background: C.beige, padding: "40px 20px", textAlign: "center" }}>
                <FadeUp>
                    <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", color: C.dark, margin: 0 }}>
                        Thu cũ đổi mới
                    </h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 8, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
                        Gửi hình ảnh sản phẩm nội thất cũ, đội ngũ Amore Home sẽ định giá và gửi ưu đãi đổi mới cho bạn.
                    </p>
                </FadeUp>
            </div>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", display: "grid", gap: 40 }}>

                <FadeUp>
                    <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 10, padding: 28, border: `1px solid ${C.sand}` }}>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 20px" }}>Gửi yêu cầu mới</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Tên sản phẩm cũ *</label>
                            <input type="text" placeholder="VD: Sofa da 3 chỗ" value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} style={styles.input} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={styles.label}>Danh mục *</label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={styles.input}>
                                    <option value="">-- Chọn danh mục --</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={styles.label}>Tình trạng *</label>
                                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} style={styles.input}>
                                    <option value="">-- Chọn tình trạng --</option>
                                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Mô tả thêm</label>
                            <textarea rows={3} placeholder="Mô tả chi tiết về sản phẩm, thời gian sử dụng, hư hỏng (nếu có)..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...styles.input, resize: "none" }} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={styles.label}>Số điện thoại liên hệ *</label>
                                <input type="tel" placeholder="" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Địa chỉ (nếu cần thẩm định tại nhà)</label>
                                <input type="text" value={form.contactAddress} onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))} style={styles.input} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={styles.label}>Hình ảnh sản phẩm cũ * (tối đa 5 ảnh)</label>
                            <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ fontSize: 13 }} />
                            {previews.length > 0 && (
                                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                    {previews.map((src, i) => (
                                        <img key={i} src={src} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.sand}` }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={submitting} style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? "Đang gửi..." : "Gửi yêu cầu định giá"}
                        </button>
                    </form>
                </FadeUp>

                {myRequests.length > 0 && (
                    <FadeUp>
                        <div>
                            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 16px" }}>Yêu cầu của tôi</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {myRequests.map(r => {
                                    const cfg = STATUS_CFG[r.status] || {};
                                    return (
                                        <div key={r._id} style={{ background: "#fff", borderRadius: 8, padding: 18, border: `1px solid ${C.sand}`, display: "flex", gap: 14 }}>
                                            {r.images?.[0] && (
                                                <img src={r.images[0]} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <p style={{ margin: 0, fontWeight: 600, color: C.dark, fontSize: 14 }}>{r.productName}</p>
                                                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cfg.bg, color: cfg.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <p style={{ margin: "4px 0", fontSize: 12, color: "#999" }}>{r.category} · {CONDITIONS.find(c => c.value === r.condition)?.label}</p>

                                                {r.status === "voucher_sent" && (
                                                    <div style={{ background: "#EEF4EA", borderRadius: 6, padding: "8px 12px", marginTop: 8 }}>
                                                        <p style={{ margin: 0, fontSize: 12, color: C.green, fontWeight: 600 }}>
                                                            Định giá: {r.appraisedValue?.toLocaleString("vi-VN")}₫ — Voucher: <strong>{r.voucherCode}</strong>
                                                        </p>
                                                    </div>
                                                )}
                                                {r.adminNote && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999", fontStyle: "italic" }}>Ghi chú: {r.adminNote}</p>}
                                                {r.status === "pending" && (
                                                    <button onClick={() => handleCancel(r._id)} style={{ marginTop: 8, background: "none", border: `1px solid ${C.error}`, color: C.error, borderRadius: 4, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}>
                                                        Huỷ yêu cầu
                                                    </button>
                                                )}
                                            </div>
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