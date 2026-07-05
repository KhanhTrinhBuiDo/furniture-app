import { useState, useEffect, useCallback } from "react";

const C = { dark: "#4A2C1A", wood: "#8B5E3C", sand: "#D9C9B0", beige: "#F0E8DC", cream: "#FAF7F2", error: "#C47B5A", green: "#6B7C5C" };
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin`;

const ROLE_CFG = {
    user: { label: "User", color: "#4285F4", bg: "#EBF2FE" },
    admin: { label: "Admin", color: C.dark, bg: C.beige },
};

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleTab, setRoleTab] = useState("");
    const [pagination, setPag] = useState({});

    const load = useCallback(async (pg = 1) => {
        setLoading(true);
        const params = new URLSearchParams({ page: pg, limit: 20 });
        if (search) params.set("q", search);
        if (roleTab) params.set("role", roleTab);
        const r = await fetch(`${API}/users?${params}`, { credentials: "include" });
        const d = await r.json();
        setUsers(d.users || []);
        setPag(d.pagination || {});
        setLoading(false);
    }, [search, roleTab]);

    useEffect(() => { const t = setTimeout(() => load(), 300); return () => clearTimeout(t); }, [load]);

    const update = async (id, body) => {
        await fetch(`${API}/users/${id}`, {
            method: "PUT", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        load();
    };

    const deleteUser = async (id, name) => {
        if (!confirm(`Xác nhận xóa người dùng "${name}"? Hành động này không thể hoàn tác.`)) return;
        await fetch(`${API}/users/${id}`, { method: "DELETE", credentials: "include" });
        load();
    };

    const exportCSV = () => window.open(`${API}/export/users`, "_blank");

    return (
        <div style={{ padding: "32px 40px", background: C.cream, minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>Quản lý người dùng</h1>
                    <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Tổng: {pagination.total || 0} người dùng</p>
                </div>
                <button onClick={exportCSV} style={S.exportBtn}>⬇ Xuất CSV</button>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                    <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.wood} strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input type="search" placeholder="Tìm theo tên, email..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ ...S.input, paddingLeft: 32 }} />
                </div>

                {/* Role filter */}
                {["", "user", "admin"].map(r => (
                    <button key={r} onClick={() => setRoleTab(r)}
                        style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all 0.2s", background: roleTab === r ? C.dark : "#fff", color: roleTab === r ? "#fff" : "#888", border: `1px solid ${roleTab === r ? C.dark : C.sand}` }}>
                        {r === "" ? "Tất cả" : ROLE_CFG[r]?.label || r}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? <p style={{ color: "#bbb", fontSize: 14 }}>Đang tải...</p> : (
                <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.sand}`, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>
                        <thead>
                            <tr style={{ background: C.beige }}>
                                {["Người dùng", "Liên hệ", "Đăng nhập", "Vai trò", "Ngày tạo", "Trạng thái", "Thao tác"].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.dark, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#bbb" }}>Không có người dùng nào</td></tr>
                            ) : users.map((u, i) => {
                                const rc = ROLE_CFG[u.role] || ROLE_CFG.user;
                                return (
                                    <tr key={u._id} style={{ borderTop: `1px solid ${C.beige}`, background: i % 2 === 0 ? "#fff" : "#FDFAF7" }}>
                                        {/* Avatar + name */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {u.avatar
                                                    ? <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                                                    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.wood, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                                                        {u.fullName?.[0]?.toUpperCase() || "?"}
                                                    </div>
                                                }
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 600, color: C.dark }}>{u.fullName}</p>
                                                    <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>ID: {u._id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <p style={{ margin: 0, color: "#666" }}>{u.email}</p>
                                            {u.phone && <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{u.phone}</p>}
                                        </td>

                                        {/* Auth provider */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, fontWeight: 600, background: u.authProvider === "google" ? "#EBF2FE" : C.beige, color: u.authProvider === "google" ? "#4285F4" : C.dark }}>
                                                {u.authProvider === "google" ? "Google" : "Email"}
                                            </span>
                                        </td>

                                        {/* Role selector */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <select value={u.role} onChange={e => update(u._id, { role: e.target.value })}
                                                style={{ fontSize: 11, padding: "4px 8px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, background: rc.bg, color: rc.color, fontFamily: "'Poppins', sans-serif", outline: "none" }}>
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>

                                        {/* Date */}
                                        <td style={{ padding: "12px 16px", color: "#999", fontSize: 12 }}>
                                            {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                                        </td>

                                        {/* Status toggle */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <button onClick={() => update(u._id, { isActive: !u.isActive })}
                                                style={{ fontSize: 11, padding: "4px 12px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Poppins', sans-serif", background: u.isActive ? "#EEF4EA" : "#FBF0ED", color: u.isActive ? C.green : C.error }}>
                                                {u.isActive ? "Hoạt động" : "Đã khoá"}
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <button onClick={() => deleteUser(u._id, u.fullName)}
                                                style={{ background: "none", border: `1px solid ${C.error}`, borderRadius: 4, padding: "4px 10px", fontSize: 11, color: C.error, cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.beige}`, display: "flex", gap: 8, justifyContent: "center" }}>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(n => (
                                <button key={n} onClick={() => load(n)}
                                    style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${n === pagination.page ? C.dark : C.sand}`, background: n === pagination.page ? C.dark : "#fff", color: n === pagination.page ? "#fff" : C.dark, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                    {n}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const S = {
    exportBtn: { background: "#4A2C1A", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
    input: { width: "100%", padding: "9px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none" },
};