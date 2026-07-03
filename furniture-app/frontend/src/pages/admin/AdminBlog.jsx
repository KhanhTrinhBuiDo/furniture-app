import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../../../store/store";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/blog`;

const EMPTY = {
    title: "", excerpt: "", content: "", coverImage: "",
    category: "Ý tưởng nội thất", tags: "", isPublished: true,
};

const CATEGORIES = ["Ý tưởng nội thất", "Xu hướng", "Hướng dẫn", "Mẹo hay", "Câu chuyện"];

export default function AdminBlog() {
    const { showToast } = useStore();

    const [posts, setPosts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);   // null | "create" | post
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Admin xem tất cả kể cả chưa publish — dùng query isPublished=all
            const res = await fetch(`${API}?limit=50`, { credentials: "include" });
            const data = await res.json();
            setPosts(data.posts || []);
            setTotal(data.pagination?.total || 0);
        } catch {
            showToast({ message: "Không thể tải bài viết", type: "error" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, []);

    const openCreate = () => { setForm(EMPTY); setErrors({}); setModal("create"); };

    const openEdit = (p) => {
        setForm({
            title: p.title || "",
            excerpt: p.excerpt || "",
            content: p.content || "",
            coverImage: p.coverImage || "",
            category: p.category || "Ý tưởng nội thất",
            tags: (p.tags || []).join(", "),
            isPublished: p.isPublished ?? true,
        });
        setErrors({});
        setModal(p);
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = "Nhập tiêu đề";
        if (!form.excerpt.trim()) e.excerpt = "Nhập mô tả ngắn";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const body = {
                ...form,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            };
            const isEdit = modal !== "create";
            const url = isEdit ? `${API}/${modal._id}` : API;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method, credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            showToast({ message: isEdit ? "Đã cập nhật bài viết" : "Đã thêm bài viết", type: "success" });
            setModal(null);
            load();
        } catch (err) {
            showToast({ message: err.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async (p) => {
        try {
            const res = await fetch(`${API}/${p._id}`, {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPublished: !p.isPublished }),
            });
            if (res.ok) {
                showToast({ message: p.isPublished ? "Đã ẩn bài viết" : "Đã xuất bản bài viết", type: "success" });
                load();
            }
        } catch { showToast({ message: "Lỗi cập nhật", type: "error" }); }
    };

    const handleDelete = async (id, title) => {
        if (!confirm(`Xóa bài viết "${title}"?`)) return;
        try {
            await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
            showToast({ message: "Đã xóa bài viết", type: "success" });
            load();
        } catch { showToast({ message: "Lỗi xóa", type: "error" }); }
    };

    // ── Seed mẫu ──────────────────────────────────────────────────────────────
    const handleSeed = async () => {
        try {
            const res = await fetch(`${API}/seed`, { method: "POST", credentials: "include" });
            const data = await res.json();
            showToast({ message: data.message || "Đã seed bài viết mẫu", type: "success" });
            load();
        } catch { showToast({ message: "Lỗi seed", type: "error" }); }
    };

    return (
        <div style={S.page}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                    <h1 style={S.pageTitle}>Quản lý Blog</h1>
                    <p style={S.pageSub}>{total} bài viết</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    {posts.length === 0 && (
                        <button onClick={handleSeed} style={S.secondaryBtn}>✨ Thêm bài mẫu</button>
                    )}
                    <button onClick={openCreate} style={S.primaryBtn}>+ Viết bài mới</button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <p style={{ color: "#bbb" }}>Đang tải...</p>
            ) : posts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
                    <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>📝</span>
                    <p style={{ fontSize: 15 }}>Chưa có bài viết nào</p>
                    <button onClick={handleSeed} style={{ ...S.primaryBtn, marginTop: 16 }}>Thêm 6 bài mẫu</button>
                </div>
            ) : (
                <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #D9C9B0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins',sans-serif" }}>
                        <thead>
                            <tr style={{ background: "#F0E8DC" }}>
                                {["Tiêu đề", "Danh mục", "Tags", "Lượt xem", "Trạng thái", "Ngày tạo", ""].map(h => (
                                    <th key={h} style={S.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map((p, i) => (
                                <tr key={p._id} style={{ borderTop: "1px solid #F0E8DC", background: i % 2 === 0 ? "#fff" : "#FDFAF7" }}>
                                    {/* Tiêu đề + ảnh */}
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                            <img src={p.coverImage || "https://via.placeholder.com/48x48"} alt=""
                                                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, background: "#F0E8DC", flexShrink: 0 }} />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, color: "#1A1A2E", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                                                <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{p.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#666" }}>{p.category}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
                                            {(p.tags || []).slice(0, 3).map(t => (
                                                <span key={t} style={{ fontSize: 10, background: "#F0E8DC", color: "#8B5E3C", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>#{t}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#666" }}>{p.viewCount || 0}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <button onClick={() => togglePublish(p)}
                                            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Poppins',sans-serif", background: p.isPublished ? "#EEF4EA" : "#F5F5F5", color: p.isPublished ? "#27AE60" : "#bbb" }}>
                                            {p.isPublished ? "Đã xuất bản" : "Bản nháp"}
                                        </button>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#999", fontSize: 12 }}>
                                        {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={() => openEdit(p)} style={S.editBtn}>Sửa</button>
                                            <button onClick={() => handleDelete(p._id, p.title)} style={{ ...S.editBtn, color: "#C0392B", borderColor: "#C0392B" }}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        <div style={S.modalHeader}>
                            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", color: "#1A1A2E", margin: 0 }}>
                                {modal === "create" ? "Viết bài mới" : `Sửa: ${modal.title}`}
                            </h2>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
                        </div>

                        <div style={{ padding: "24px 28px", maxHeight: "70vh", overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                <MF label="Tiêu đề *" error={errors.title}>
                                    <MI value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="VD: 5 Ý tưởng trang trí phòng khách..." hasError={!!errors.title} />
                                </MF>

                                <Row>
                                    <MF label="Danh mục">
                                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={S.input}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </MF>
                                    <MF label="Tags (cách nhau dấu phẩy)">
                                        <MI value={form.tags} onChange={v => setForm(p => ({ ...p, tags: v }))} placeholder="noi that, thiet ke, phong khach" />
                                    </MF>
                                </Row>

                                <MF label="Mô tả ngắn *" error={errors.excerpt}>
                                    <textarea value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
                                        placeholder="Tóm tắt ngắn gọn nội dung bài viết..." rows={3}
                                        style={{ ...S.input, resize: "vertical", fontFamily: "'Poppins',sans-serif" }} />
                                </MF>

                                <MF label="Ảnh bìa (URL)">
                                    <MI value={form.coverImage} onChange={v => setForm(p => ({ ...p, coverImage: v }))} placeholder="https://images.unsplash.com/..." />
                                    {form.coverImage && (
                                        <img src={form.coverImage} alt="" style={{ marginTop: 8, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #D9C9B0" }} />
                                    )}
                                </MF>

                                <MF label="Nội dung (HTML)">
                                    <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                                        placeholder="<p>Nội dung bài viết...</p><h3>Tiêu đề phụ</h3><p>...</p>"
                                        rows={10} style={{ ...S.input, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
                                </MF>

                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1A1A2E", cursor: "pointer" }}>
                                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} style={{ accentColor: "#B8860B" }} />
                                    Xuất bản ngay
                                </label>
                            </div>
                        </div>

                        <div style={{ padding: "14px 28px", borderTop: "1px solid #F0E8DC", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button onClick={() => setModal(null)} disabled={saving} style={S.cancelBtn}>Huỷ</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...S.primaryBtn, opacity: saving ? 0.7 : 1, minWidth: 140 }}>
                                {saving ? "Đang lưu..." : modal === "create" ? "Đăng bài" : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;
function MF({ label, error, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E", letterSpacing: "0.05em" }}>{label}</label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: "#C0392B" }}>{error}</p>}
        </div>
    );
}
function MI({ onChange, hasError, ...props }) {
    return (
        <input {...props} onChange={e => onChange(e.target.value)}
            style={{ ...S.input, borderColor: hasError ? "#C0392B" : "#D9C9B0" }}
            onFocus={e => !hasError && (e.target.style.borderColor = "#B8860B")}
            onBlur={e => !hasError && (e.target.style.borderColor = "#D9C9B0")} />
    );
}

const S = {
    page: { padding: "32px 40px", background: "#FAF7F2", minHeight: "100vh" },
    pageTitle: { fontFamily: "'Cormorant Garamond',serif", fontSize: "1.6rem", color: "#1A1A2E", margin: 0 },
    pageSub: { fontSize: 13, color: "#999", marginTop: 4 },
    primaryBtn: { background: "#1A1A2E", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
    secondaryBtn: { background: "#F0E8DC", color: "#1A1A2E", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
    cancelBtn: { background: "#F0E8DC", color: "#1A1A2E", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
    editBtn: { background: "none", border: "1px solid #D9C9B0", borderRadius: 4, padding: "5px 12px", fontSize: 12, color: "#8B5E3C", cursor: "pointer" },
    input: { padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
    th: { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1A1A2E", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 300, padding: "40px 20px", overflowY: "auto" },
    modal: { background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #F0E8DC", background: "#FAF7F2" },
};