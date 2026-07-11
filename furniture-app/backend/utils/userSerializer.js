// ─── Chuẩn hoá User document trả về cho client ───────────────────────────────
// Model User mới không còn method toPublicJSON()/authProvider field như bản cũ,
// nên tập trung logic này ở đây để auth.js / admin.js dùng chung, tránh lặp code.
export function sanitizeUser(userDoc) {
    if (!userDoc) return null;
    const u = typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;

    return {
        _id: u._id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone || "",
        role: u.role,
        avatar: u.avatar || "",
        dob: u.dob || null,
        isActive: u.is_active !== false,
        addresses: u.addresses || [],
        styleIds: u.style_ids || [],
        wishlist: u.wishlist || [],
        // authProvider không còn là field lưu trữ — suy ra từ sự hiện diện của google_id
        authProvider: u.google_id ? "google" : "local",
        createdAt: u.created_at,
        updatedAt: u.updated_at,
    };
}