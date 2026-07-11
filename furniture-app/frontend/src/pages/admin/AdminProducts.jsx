import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "../../../../store/store";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`;

const CATEGORIES = ["LIVING ROOM", "KITCHEN", "BEDROOM", "BATHROOM", "DECORATION", "DINING ROOM"];
const STYLES = ["Tối giản", "Hàn Quốc", "Scandinavian", "Hiện đại", "Đông Dương", "Cổ điển", "Tropical", "Matcha"];

const EMPTY_FORM = {
    name: "", description: "", price: "", salePrice: "",
    category: "", style: "", stock: "0",
    isActive: true, isFeatured: false, isNewProduct: false,
    tags: "", specifications: "",
    images: [],       // URL ảnh đang giữ lại
};

// ─── Component chính ─────────────────────────────────────────────────────────
export default function AdminProducts() {
    const { showToast } = useStore();

    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("");
    const [showHidden, setShowHidden] = useState(false);

    const [modal, setModal] = useState(null);  // null | "create" | product
    const [form, setForm] = useState(EMPTY_FORM);
    const [files, setFiles] = useState([]);    // File objects để upload
    const [previews, setPreviews] = useState([]);    // preview URL
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const fileRef = useRef(null);

    // ── Fetch products ────────────────────────────────────────────────────────
    const load = useCallback(async (pg = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, limit: 15 });
            if (search) params.set("q", search);
            if (catFilter) params.set("category", catFilter);
            if (!showHidden) params.set("isActive", "true");

            const res = await fetch(`${API}/admin/all?${params}`, { credentials: "include" });
            const data = await res.json();
            setProducts(data.products || []);
            setTotal(data.pagination?.total || 0);
        } catch {
            showToast({ message: "Không thể tải danh sách sản phẩm", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [page, search, catFilter, showHidden]);

    useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [search, catFilter, showHidden]);
    useEffect(() => { load(); }, [page]);

    // ── Open modal ────────────────────────────────────────────────────────────
    const openCreate = () => {
        setForm(EMPTY_FORM);
        setFiles([]);
        setPreviews([]);
        setErrors({});
        setModal("create");
    };

    const openEdit = (p) => {
        setForm({
            ...EMPTY_FORM,
            name: p.name || "",
            description: p.description || "",
            price: String(p.price || ""),
            salePrice: p.salePrice ? String(p.salePrice) : "",
            category: p.category || "",
            style: p.style || "",
            stock: String(p.stock ?? "0"),
            isActive: p.isActive ?? true,
            isFeatured: p.isFeatured ?? false,
            isNewProduct: p.isNewProduct ?? false,
            tags: (p.tags || []).join(", "),
            specifications: p.specifications ? JSON.stringify(p.specifications, null, 2) : "",
            images: p.images || [],
        });
        setFiles([]);
        setPreviews([]);
        setErrors({});
        setModal(p);
    };

    // ── File input ────────────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        const valid = selected.filter(f => {
            if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
                showToast({ message: `"${f.name}" không phải ảnh hợp lệ`, type: "error" }); return false;
            }
            if (f.size > 5 * 1024 * 1024) {
                showToast({ message: `"${f.name}" quá 5MB`, type: "error" }); return false;
            }
            return true;
        });
        setFiles(prev => [...prev, ...valid]);
        setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    };

    const removeExistingImage = (url) => {
        setForm(p => ({ ...p, images: p.images.filter(i => i !== url) }));
    };

    const removeNewFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Tên sản phẩm là bắt buộc";
        if (!form.category) e.category = "Chọn danh mục";
        if (!form.price || Number(form.price) <= 0) e.price = "Giá phải lớn hơn 0";
        if (form.salePrice && Number(form.salePrice) >= Number(form.price)) e.salePrice = "Giá KM phải nhỏ hơn giá gốc";
        if (modal === "create" && form.images.length === 0 && files.length === 0) e.images = "Cần ít nhất 1 ảnh";
        setErrors(e);
        return !Object.keys(e).length;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);

        try {
            const fd = new FormData();

            // Text fields
            const textFields = ["name", "description", "price", "salePrice", "category", "style", "stock"];
            textFields.forEach(k => fd.append(k, form[k] || ""));
            fd.append("isActive", String(form.isActive));
            fd.append("isFeatured", String(form.isFeatured));
            fd.append("isNewProduct", String(form.isNewProduct));

            // Tags
            const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
            fd.append("tags", JSON.stringify(tags));

            // Specifications
            if (form.specifications.trim()) {
                try { JSON.parse(form.specifications); fd.append("specifications", form.specifications); }
                catch { showToast({ message: "JSON thông số kỹ thuật không hợp lệ", type: "error" }); setSaving(false); return; }
            }

            // Existing images to keep (khi sửa)
            form.images.forEach(url => fd.append("images", url));

            // New files
            files.forEach(f => fd.append("images", f));

            const isEdit = modal !== "create";
            const url = isEdit ? `${API}/${modal._id}` : API;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, { method, credentials: "include", body: fd });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Lỗi lưu sản phẩm");

            showToast({ message: isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới", type: "success" });
            setModal(null);
            load(1);
        } catch (err) {
            showToast({ message: err.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle active ─────────────────────────────────────────────────────────
    const toggleActive = async (p) => {
        const res = await fetch(`${API}/${p._id}`, {
            method: "PUT",
            credentials: "include",
            body: new URLSearchParams({ isActive: String(!p.isActive) }),
        });
        if (res.ok) { showToast({ message: p.isActive ? "Đã ẩn sản phẩm" : "Đã hiện sản phẩm", type: "success" }); load(); }
    };

    const totalPages = Math.ceil(total / 15);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: "32px 40px", background: "var(--surface-0)", minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#4A2C1A", margin: 0 }}>Quản lý sản phẩm</h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>FR-08 — {total} sản phẩm</p>
                </div>
                <button onClick={openCreate} style={S.primaryBtn}>+ Thêm sản phẩm</button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                <input type="search" placeholder="Tìm tên sản phẩm..." value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{ ...S.input, maxWidth: 280 }} />

                <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} style={S.select}>
                    <option value="">Tất cả danh mục</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#666", cursor: "pointer" }}>
                    <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} style={{ accentColor: "#8B5E3C" }} />
                    Hiện sản phẩm ẩn
                </label>

                <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb" }}>{total} sản phẩm</span>
            </div>

            {/* Table */}
            {loading ? (
                <p style={{ color: "#bbb", fontSize: 14 }}>Đang tải...</p>
            ) : (
                <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #D9C9B0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins',sans-serif" }}>
                        <thead>
                            <tr style={{ background: "#F0E8DC" }}>
                                {["Sản phẩm", "Danh mục", "Giá", "Tồn kho", "Đã bán", "Trạng thái", ""].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#4A2C1A", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Không có sản phẩm nào</td></tr>
                            ) : products.map((p, i) => (
                                <tr key={p._id} style={{ borderTop: "1px solid #F0E8DC", background: i % 2 === 0 ? "#fff" : "#FDFAF7", opacity: p.isActive ? 1 : 0.55 }}>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <img src={p.img || p.images?.[0] || "https://via.placeholder.com/48"} alt={p.name}
                                                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, background: "#F0E8DC", flexShrink: 0 }} />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, color: "#4A2C1A", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                                                <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{p.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#666" }}>{p.category}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: p.salePrice ? "#C47B5A" : "#8B5E3C" }}>
                                            {new Intl.NumberFormat("vi-VN").format(p.salePrice || p.price)}₫
                                        </p>
                                        {p.salePrice && <p style={{ margin: 0, fontSize: 11, color: "#bbb", textDecoration: "line-through" }}>{new Intl.NumberFormat("vi-VN").format(p.price)}₫</p>}
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? "#C47B5A" : p.stock < 5 ? "#D4A843" : "#6B7C5C" }}>
                                            {p.stock}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#666" }}>{p.sold}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <button onClick={() => toggleActive(p)}
                                            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Poppins',sans-serif", background: p.isActive ? "#EEF4EA" : "#F5F5F5", color: p.isActive ? "#6B7C5C" : "#bbb" }}>
                                            {p.isActive ? "Đang bán" : "Đã ẩn"}
                                        </button>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <button onClick={() => openEdit(p)} style={S.editBtn}>Sửa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #F0E8DC", display: "flex", gap: 6, justifyContent: "center" }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...S.pageBtn, opacity: page === 1 ? 0.4 : 1 }}>←</button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => setPage(n)}
                                    style={{ ...S.pageBtn, background: n === page ? "#4A2C1A" : "#fff", color: n === page ? "#fff" : "#4A2C1A", border: `1px solid ${n === page ? "#4A2C1A" : "#D9C9B0"}` }}>
                                    {n}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...S.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}>→</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal Thêm/Sửa ─────────────────────────────────────────────────── */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 300, padding: "40px 20px", overflowY: "auto" }}>
                    <div style={{ background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

                        {/* Modal header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #F0E8DC", background: "#FAF7F2" }}>
                            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: "#4A2C1A", margin: 0 }}>
                                {modal === "create" ? "Thêm sản phẩm mới" : `Sửa: ${modal.name}`}
                            </h2>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
                        </div>

                        <div style={{ padding: "24px 28px", maxHeight: "75vh", overflowY: "auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                                {/* Tên sản phẩm */}
                                <MF label="Tên sản phẩm *" error={errors.name}>
                                    <MI value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="VD: Sylvester Sofa" hasError={!!errors.name} />
                                </MF>

                                {/* Danh mục + Phong cách */}
                                <Row>
                                    <MF label="Danh mục *" error={errors.category}>
                                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                            style={{ ...S.input, borderColor: errors.category ? "#C47B5A" : "#D9C9B0" }}>
                                            <option value="">Chọn danh mục</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </MF>
                                    <MF label="Phong cách không gian">
                                        <select value={form.style} onChange={e => setForm(p => ({ ...p, style: e.target.value }))} style={S.input}>
                                            <option value="">Không chỉ định</option>
                                            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </MF>
                                </Row>

                                {/* Giá + Giá KM */}
                                <Row>
                                    <MF label="Giá gốc (₫) *" error={errors.price}>
                                        <MI type="number" value={form.price} onChange={v => setForm(p => ({ ...p, price: v }))} placeholder="2500000" hasError={!!errors.price} />
                                    </MF>
                                    <MF label="Giá khuyến mãi (₫)" error={errors.salePrice}>
                                        <MI type="number" value={form.salePrice} onChange={v => setForm(p => ({ ...p, salePrice: v }))} placeholder="Để trống nếu không KM" hasError={!!errors.salePrice} />
                                    </MF>
                                </Row>

                                {/* Tồn kho */}
                                <MF label="Tồn kho">
                                    <MI type="number" value={form.stock} onChange={v => setForm(p => ({ ...p, stock: v }))} placeholder="0" />
                                </MF>

                                {/* Mô tả */}
                                <MF label="Mô tả sản phẩm">
                                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Mô tả chi tiết sản phẩm..." rows={4}
                                        style={{ ...S.input, resize: "vertical", fontFamily: "'Poppins',sans-serif" }} />
                                </MF>

                                {/* Tags */}
                                <MF label="Tags (cách nhau bằng dấu phẩy)">
                                    <MI value={form.tags} onChange={v => setForm(p => ({ ...p, tags: v }))} placeholder="sofa, phong khach, hien dai" />
                                </MF>

                                {/* Thông số kỹ thuật (JSON) */}
                                <MF label='Thông số kỹ thuật (JSON) — VD: [{"key":"Kích thước","value":"120x60x75"}]'>
                                    <textarea value={form.specifications} onChange={e => setForm(p => ({ ...p, specifications: e.target.value }))}
                                        placeholder='[{"key":"Kích thước","value":"120 x 60 x 75 cm"},{"key":"Chất liệu","value":"Gỗ sồi"}]'
                                        rows={3} style={{ ...S.input, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
                                </MF>

                                {/* Ảnh hiện tại */}
                                {form.images.length > 0 && (
                                    <MF label="Ảnh hiện tại">
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            {form.images.map(url => (
                                                <div key={url} style={{ position: "relative" }}>
                                                    <img src={url.startsWith("/") ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${url}` : url}
                                                        alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #D9C9B0" }} />
                                                    <button onClick={() => removeExistingImage(url)}
                                                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#C47B5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </MF>
                                )}

                                {/* Upload ảnh mới */}
                                <MF label={`Upload ảnh mới (JPG/PNG/WebP, tối đa 5MB/ảnh)`} error={errors.images}>
                                    <div>
                                        <button type="button" onClick={() => fileRef.current?.click()}
                                            style={{ ...S.editBtn, marginBottom: 10 }}>
                                            + Chọn ảnh
                                        </button>
                                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                                            multiple style={{ display: "none" }} onChange={handleFileChange} />

                                        {previews.length > 0 && (
                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                                {previews.map((url, i) => (
                                                    <div key={i} style={{ position: "relative" }}>
                                                        <img src={url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "2px solid #8B5E3C" }} />
                                                        <button onClick={() => removeNewFile(i)}
                                                            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#C47B5A", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </MF>

                                {/* Flags */}
                                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                    {[
                                        { key: "isActive", label: "Đang bán" },
                                        { key: "isFeatured", label: "Nổi bật" },
                                        { key: "isNewProduct", label: "Sản phẩm mới" },
                                    ].map(flag => (
                                        <label key={flag.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4A2C1A", cursor: "pointer" }}>
                                            <input type="checkbox" checked={form[flag.key]} onChange={e => setForm(p => ({ ...p, [flag.key]: e.target.checked }))}
                                                style={{ accentColor: "#8B5E3C" }} />
                                            {flag.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "16px 28px", borderTop: "1px solid #F0E8DC", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button onClick={() => setModal(null)} disabled={saving} style={S.cancelBtn}>Huỷ</button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ ...S.primaryBtn, opacity: saving ? 0.7 : 1, minWidth: 140 }}>
                                {saving ? "Đang lưu..." : modal === "create" ? "Thêm sản phẩm" : "Lưu thay đổi"}
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

function MF({ label, error, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#4A2C1A", letterSpacing: "0.05em" }}>{label}</label>
            {children}
            {error && <p style={{ margin: 0, fontSize: 11, color: "#C47B5A" }}>{error}</p>}
        </div>
    );
}

function MI({ hasError, onChange, ...props }) {
    return (
        <input {...props} onChange={e => onChange(e.target.value)}
            style={{ ...S.input, borderColor: hasError ? "#C47B5A" : "#D9C9B0" }}
            onFocus={e => !hasError && (e.target.style.borderColor = "#8B5E3C")}
            onBlur={e => !hasError && (e.target.style.borderColor = "#D9C9B0")} />
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    primaryBtn: { background: "#4A2C1A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif", transition: "background 0.2s" },
    cancelBtn: { background: "#F0E8DC", color: "#4A2C1A", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
    editBtn: { background: "none", border: "1px solid #D9C9B0", borderRadius: 4, padding: "5px 12px", fontSize: 12, color: "#8B5E3C", cursor: "pointer", fontFamily: "'Poppins',sans-serif" },
    input: { padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
    select: { padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins',sans-serif", outline: "none", background: "#fff", cursor: "pointer", width: "100%", boxSizing: "border-box" },
    pageBtn: { width: 32, height: 32, borderRadius: 6, border: "1px solid #D9C9B0", background: "#fff", color: "#4A2C1A", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" },
};