import { useState } from "react";
import { useStore } from "../../../store/store";
import { updateProfile, changePassword, uploadAvatar } from "../services/authService";

const C = {
    bg: "#FAF7F2", card: "#fff", dark: "#4A2C1A", wood: "#8B5E3C",
    sand: "#D9C9B0", beige: "#F0E8DC", error: "#C47B5A", success: "#6B7C5C",
};

export default function ProfilePage() {
    const { currentUser, setCurrentUser, showToast } = useStore();

    const [tab, setTab] = useState("info"); // info | password

    // ─── Thông tin cá nhân ────────────────────────────────────────────────
    const [form, setForm] = useState({
        fullName: currentUser?.fullName || "",
        phone: currentUser?.phone || "",
        dob: currentUser?.dob ? currentUser.dob.slice(0, 10) : "",
        avatar: currentUser?.avatar || "",
    });
    const [savingInfo, setSavingInfo] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleAvatarSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast({ message: "Vui lòng chọn file ảnh", type: "error" });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast({ message: "Ảnh tối đa 5MB", type: "error" });
            return;
        }
        setUploadingAvatar(true);
        try {
            const { user } = await uploadAvatar(file);
            setCurrentUser(user);
            setForm(f => ({ ...f, avatar: user.avatar }));
            showToast({ message: "Cập nhật ảnh đại diện thành công", type: "success" });
        } catch (err) {
            showToast({ message: err.message || "Tải ảnh thất bại", type: "error" });
        }
        setUploadingAvatar(false);
    };

    const handleInfoChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        setSavingInfo(true);
        try {
            const { user } = await updateProfile(form);
            setCurrentUser(user);
            showToast({ message: "Cập nhật thông tin thành công", type: "success" });
        } catch (err) {
            showToast({ message: err.message || "Cập nhật thất bại", type: "error" });
        }
        setSavingInfo(false);
    };

    // ─── Đổi mật khẩu ─────────────────────────────────────────────────────
    const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [pwdErrors, setPwdErrors] = useState({});
    const [savingPwd, setSavingPwd] = useState(false);

    const handlePwdChange = (e) => {
        setPwdForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setPwdErrors(p => ({ ...p, [e.target.name]: "", general: "" }));
    };

    const validatePwd = () => {
        const e = {};
        if (!pwdForm.currentPassword) e.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
        if (!pwdForm.newPassword) e.newPassword = "Vui lòng nhập mật khẩu mới";
        else if (pwdForm.newPassword.length < 8) e.newPassword = "Mật khẩu tối thiểu 8 ký tự";
        else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(pwdForm.newPassword)) e.newPassword = "Cần ít nhất 1 chữ hoa và 1 số";
        if (pwdForm.newPassword !== pwdForm.confirmPassword) e.confirmPassword = "Mật khẩu xác nhận không khớp";
        setPwdErrors(e);
        return !Object.keys(e).length;
    };

    const handlePwdSubmit = async (e) => {
        e.preventDefault();
        if (!validatePwd()) return;
        setSavingPwd(true);
        try {
            await changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
            showToast({ message: "Đổi mật khẩu thành công", type: "success" });
            setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            setPwdErrors({ general: err.message || "Đổi mật khẩu thất bại" });
        }
        setSavingPwd(false);
    };

    if (!currentUser) return null;

    return (
        <div style={{ background: C.bg, minHeight: "100vh", padding: "40px 20px" }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                    {currentUser.avatar
                        ? <img src={currentUser.avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
                        : <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.dark, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700 }}>
                            {currentUser.fullName?.[0]?.toUpperCase()}
                        </div>
                    }
                    <div>
                        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: C.dark, margin: 0 }}>{currentUser.fullName}</h1>
                        <p style={{ fontSize: 13, color: "#999", margin: "2px 0 0" }}>{currentUser.email}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${C.sand}`, marginBottom: 24 }}>
                    {[{ key: "info", label: "Thông tin cá nhân" }, { key: "password", label: "Đổi mật khẩu" }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                background: "none", border: "none", cursor: "pointer", padding: "10px 20px",
                                fontSize: 13, fontFamily: "'Poppins', sans-serif",
                                color: tab === t.key ? C.wood : "#888", fontWeight: tab === t.key ? 600 : 400,
                                borderBottom: `2px solid ${tab === t.key ? C.wood : "transparent"}`,
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Thông tin cá nhân */}
                {tab === "info" && (
                    <form onSubmit={handleInfoSubmit} style={{ background: C.card, borderRadius: 10, padding: 28, border: `1px solid ${C.sand}` }}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Họ và tên *</label>
                            <input type="text" name="fullName" value={form.fullName} onChange={handleInfoChange} style={styles.input} required />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Email</label>
                            <input type="email" value={currentUser.email} disabled style={{ ...styles.input, background: C.beige, color: "#999", cursor: "not-allowed" }} />
                            <p style={{ fontSize: 11, color: "#bbb", margin: "4px 0 0" }}>Không thể thay đổi email tài khoản</p>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={styles.label}>Số điện thoại</label>
                                <input type="tel" name="phone" placeholder="0912345678" value={form.phone} onChange={handleInfoChange} style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Ngày sinh</label>
                                <input type="date" name="dob" value={form.dob} onChange={handleInfoChange} style={styles.input} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={styles.label}>Ảnh đại diện</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                {form.avatar
                                    ? <img src={form.avatar} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                    : <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.beige, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#bbb", flexShrink: 0 }}>?</div>
                                }
                                <label style={{
                                    display: "inline-flex", alignItems: "center", gap: 8,
                                    background: C.beige, border: `1px solid ${C.sand}`, borderRadius: 6,
                                    padding: "9px 16px", fontSize: 12, fontWeight: 600, color: C.dark,
                                    cursor: uploadingAvatar ? "not-allowed" : "pointer", opacity: uploadingAvatar ? 0.6 : 1,
                                }}>
                                    {uploadingAvatar ? "Đang tải lên..." : "Chọn ảnh mới"}
                                    <input type="file" accept="image/*" onChange={handleAvatarSelect} disabled={uploadingAvatar} style={{ display: "none" }} />
                                </label>
                            </div>
                            <p style={{ fontSize: 11, color: "#bbb", margin: "6px 0 0" }}>Ảnh sẽ được lưu lại ngay khi chọn, không cần bấm "Lưu thay đổi". JPG/PNG/WebP, tối đa 5MB.</p>
                        </div>

                        <button type="submit" disabled={savingInfo}
                            style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 600, cursor: savingInfo ? "not-allowed" : "pointer", opacity: savingInfo ? 0.7 : 1 }}>
                            {savingInfo ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </form>
                )}

                {/* Tab: Đổi mật khẩu */}
                {tab === "password" && (
                    <form onSubmit={handlePwdSubmit} style={{ background: C.card, borderRadius: 10, padding: 28, border: `1px solid ${C.sand}` }}>
                        {pwdErrors.general && (
                            <div style={{ background: "#FBF0ED", border: `1px solid ${C.error}`, borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.error }}>
                                {pwdErrors.general}
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Mật khẩu hiện tại *</label>
                            <input type="password" name="currentPassword" value={pwdForm.currentPassword} onChange={handlePwdChange}
                                style={{ ...styles.input, borderColor: pwdErrors.currentPassword ? C.error : C.sand }} />
                            {pwdErrors.currentPassword && <p style={styles.errorText}>{pwdErrors.currentPassword}</p>}
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Mật khẩu mới *</label>
                            <input type="password" name="newPassword" value={pwdForm.newPassword} onChange={handlePwdChange}
                                style={{ ...styles.input, borderColor: pwdErrors.newPassword ? C.error : C.sand }} />
                            {pwdErrors.newPassword && <p style={styles.errorText}>{pwdErrors.newPassword}</p>}
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={styles.label}>Xác nhận mật khẩu mới *</label>
                            <input type="password" name="confirmPassword" value={pwdForm.confirmPassword} onChange={handlePwdChange}
                                style={{ ...styles.input, borderColor: pwdErrors.confirmPassword ? C.error : C.sand }} />
                            {pwdErrors.confirmPassword && <p style={styles.errorText}>{pwdErrors.confirmPassword}</p>}
                        </div>

                        <button type="submit" disabled={savingPwd}
                            style={{ background: C.wood, color: "#fff", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 600, cursor: savingPwd ? "not-allowed" : "pointer", opacity: savingPwd ? 0.7 : 1 }}>
                            {savingPwd ? "Đang lưu..." : "Đổi mật khẩu"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

const styles = {
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#4A2C1A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #D9C9B0", borderRadius: 6, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: "none", boxSizing: "border-box" },
    errorText: { color: "#C47B5A", fontSize: 11, margin: "4px 0 0" },
};