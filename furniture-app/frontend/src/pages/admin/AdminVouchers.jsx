import { useState, useEffect } from "react";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", cream: "#FAF7F2", error: "#C47B5A", green: "#6B7C5C", gold: "#D4A843" };
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin`;
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n);

const EMPTY = { code: "", description: "", type: "percent", value: "", maxDiscount: "", minOrderValue: "", usageLimit: "", startDate: "", endDate: "", isActive: true };

export default function AdminVouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);   // null | "create" | voucher object
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const load = async () => {
        setLoading(true);
        const r = await fetch(`${API}/vouchers`, { credentials: "include" });
        const d = await r.json();
        setVouchers(d.vouchers || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setForm(EMPTY); setErrors({}); setModal("create"); };
    const openEdit = (v) => {
        setForm({
            ...v,
            startDate: v.startDate ? v.startDate.slice(0, 10) : "",
            endDate: v.endDate ? v.endDate.slice(0, 10) : "",
            maxDiscount: v.maxDiscount ?? "",
            usageLimit: v.usageLimit ?? "",
        });
        setErrors({});
        setModal(v);
    };

    const validate = () => {
        const e = {};
        if (!form.code.trim()) e.code = "Nhập mã voucher";
        if (!form.value || form.value <= 0) e.value = "Nhập giá trị";
        if (form.type === "percent" && form.value > 100) e.value = "Percent tối đa 100%";
        if (!form.endDate) e.endDate = "Chọn ngày hết hạn";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        const body = {
            ...form,
            code: form.code.toUpperCase().trim(),
            value: Number(form.value),
            maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
            minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        };

        const isEdit = modal !== "create";
        const url = isEdit ? `${API}/vouchers/${modal._id}` : `${API}/vouchers`;
        const method = isEdit ? "PUT" : "POST";

        const r = await fetch(url, {
            method, credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (r.ok) { await load(); setModal(null); }
        else { const d = await r.json(); setErrors({ general: d.message }); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Xác nhận xóa voucher?")) return;
        await fetch(`${API}/vouchers/${id}`, { method: "DELETE", credentials: "include" });
        await load();
    };

    const toggleActive = async (v) => {
        await fetch(`${API}/vouchers/${v._id}`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !v.isActive }),
        });
        await load();
    };

    const isExpired = (v) => new Date(v.endDate) < new Date();

    return (
        <div style={{ padding: "32px 40px", background: C.cream, minHeight: "100vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>Quản lý Voucher</h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{vouchers.length} voucher</p>
                </div>
                <button onClick={openCreate} style={S.primaryBtn}>+ Tạo voucher</button>
            </div>

            {loading ? <p style={{ color: "#bbb" }}>Đang tải...</p> : (
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                        <thead>
                            <tr style={{ background: C.beige }}>
                                {["Mã", "Mô tả", "Loại", "Giá trị", "Đơn tối thiểu", "Đã dùng", "Hết hạn", "Trạng thái", ""].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.dark, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Chưa có voucher nào</td></tr>
                            ) : vouchers.map((v, i) => {
                                const expired = isExpired(v);
                                return (
                                    <tr key={v._id} style={{ borderTop: `1px solid ${C.beige}`, background: i % 2 === 0 ? "#fff" : "#FDFAF7", opacity: !v.isActive || expired ? 0.6 : 1 }}>
                                        <td style={{ padding: "12px 16px", fontWeight: 700, color: C.dark, fontFamily: "monospace", fontSize: 14 }}>{v.code}</td>
                                        <td style={{ padding: "12px 16px", color: "#666", maxWidth: 200 }}>{v.description || "—"}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: v.type === "percent" ? "#EBF2FE" : "#F5EDE3", color: v.type === "percent" ? "#4285F4" : C.wood, fontWeight: 600 }}>
                                                {v.type === "percent" ? "%" : "₫"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.wood }}>
                                            {v.type === "percent" ? `${v.value}%` : `${fmt(v.value)}₫`}
                                            {v.maxDiscount ? <span style={{ fontSize: 11, color: "#bbb", display: "block" }}>Tối đa {fmt(v.maxDiscount)}₫</span> : null}
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#666" }}>{v.minOrderValue ? `${fmt(v.minOrderValue)}₫` : "—"}</td>
                                        <td style={{ padding: "12px 16px", color: "#666" }}>
                                            {v.usedCount}{v.usageLimit ? `/${v.usageLimit}` : ""}
                                        </td>
                                        <td style={{ padding: "12px 16px", color: expired ? C.error : "#666", fontSize: 12 }}>
                                            {new Date(v.endDate).toLocaleDateString("vi-VN")}
                                            {expired && <span style={{ display: "block", fontSize: 10, fontWeight: 700 }}>HẾT HẠN</span>}
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <button onClick={() => toggleActive(v)}
                                                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, background: v.isActive ? "#EEF4EA" : "#F5F5F5", color: v.isActive ? C.green : "#bbb" }}>
                                                {v.isActive ? "Hoạt động" : "Tắt"}
                                            </button>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button onClick={() => openEdit(v)} style={S.iconBtn} title="Sửa">✏️</button>
                                                <button onClick={() => handleDelete(v._id)} style={{ ...S.iconBtn, color: C.error }} title="Xóa">🗑</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
                    <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: C.dark, margin: 0 }}>
                                {modal === "create" ? "Tạo voucher mới" : `Sửa voucher: ${modal.code}`}
                            </h2>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#bbb" }}>✕</button>
                        </div>

                        {errors.general && <div style={S.errorBox}>{errors.general}</div>}

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <Row>
                                <MF label="Mã voucher *" error={errors.code}>
                                    <MI value={form.code} onChange={v => setForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder="" hasError={!!errors.code} />
                                </MF>
                                <MF label="Loại">
                                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={S.select}>
                                        <option value="percent">Phần trăm (%)</option>
                                        <option value="fixed">Số tiền cố định (₫)</option>
                                    </select>
                                </MF>
                            </Row>

                            <Row>
                                <MF label={`Giá trị * ${form.type === "percent" ? "(%)" : "(₫)"}`} error={errors.value}>
                                    <MI type="number" value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder={form.type === "percent" ? "10" : "50000"} hasError={!!errors.value} />
                                </MF>
                                {form.type === "percent" && (
                                    <MF label="Giảm tối đa (₫)">
                                        <MI type="number" value={form.maxDiscount} onChange={v => setForm(p => ({ ...p, maxDiscount: v }))} placeholder="200000" />
                                    </MF>
                                )}
                            </Row>

                            <Row>
                                <MF label="Đơn hàng tối thiểu (₫)">
                                    <MI type="number" value={form.minOrderValue} onChange={v => setForm(p => ({ ...p, minOrderValue: v }))} placeholder="500000" />
                                </MF>
                                <MF label="Giới hạn lượt dùng">
                                    <MI type="number" value={form.usageLimit} onChange={v => setForm(p => ({ ...p, usageLimit: v }))} placeholder="Để trống = không giới hạn" />
                                </MF>
                            </Row>

                            <Row>
                                <MF label="Ngày bắt đầu">
                                    <MI type="date" value={form.startDate} onChange={v => setForm(p => ({ ...p, startDate: v }))} />
                                </MF>
                                <MF label="Ngày hết hạn *" error={errors.endDate}>
                                    <MI type="date" value={form.endDate} onChange={v => setForm(p => ({ ...p, endDate: v }))} hasError={!!errors.endDate} />
                                </MF>
                            </Row>

                            <MF label="Mô tả">
                                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả ngắn về voucher" style={S.input} />
                            </MF>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dark, cursor: "pointer" }}>
                                <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} style={{ accentColor: C.wood }} />
                                Kích hoạt voucher
                            </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                            <button onClick={() => setModal(null)} style={S.cancelBtn}>Hủy</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...S.primaryBtn, opacity: saving ? 0.7 : 1 }}>
                                {saving ? "Đang lưu..." : modal === "create" ? "Tạo voucher" : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;
const MF = ({ label, error, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#4A2C1A", letterSpacing: "0.05em" }}>{label}</label>
        {children}
        {error && <p style={{ margin: 0, fontSize: 11, color: "#C47B5A" }}>{error}</p>}
    </div>
);
const MI = ({ onChange, hasError, ...props }) => (
    <input {...props} onChange={e => onChange(e.target.value)}
        style={{ ...S.input, borderColor: hasError ? "#C47B5A" : "#D9C9B0" }}
        onFocus={(e) => !hasError && (e.target.style.borderColor = "#8B5E3C")}
        onBlur={(e) => !hasError && (e.target.style.borderColor = "#D9C9B0")} />
);

const S = {
    primaryBtn: { background: "#4A2C1A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
    cancelBtn: { background: "#F0E8DC", color: "#4A2C1A", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
    iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 },
    input: { padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none", transition: "border-color 0.2s", width: "100%", boxSizing: "border-box" },
    select: { padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none", background: "#fff", width: "100%", cursor: "pointer" },
    errorBox: { background: "#FBF0ED", border: "1px solid #C47B5A", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#C47B5A" },
};