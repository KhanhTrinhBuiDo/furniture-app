const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tradein`;

async function jsonReq(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

/** Gửi yêu cầu thu cũ đổi mới — kèm ảnh (multipart/form-data) */
export async function createTradeInRequest({ productName, category, description, condition, contactPhone, contactAddress, images }) {
    const form = new FormData();
    form.append("productName", productName);
    form.append("category", category);
    form.append("description", description || "");
    form.append("condition", condition);
    form.append("contactPhone", contactPhone);
    form.append("contactAddress", contactAddress || "");
    (images || []).forEach(file => form.append("images", file));

    const res = await fetch(`${BASE}/`, {
        method: "POST",
        credentials: "include",
        body: form, // Không set Content-Type — browser tự set kèm boundary
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

/** Danh sách yêu cầu của tôi */
export async function getMyTradeInRequests() {
    return jsonReq("/my");
}

/** Huỷ yêu cầu */
export async function cancelTradeInRequest(id) {
    return jsonReq(`/${id}/cancel`, { method: "POST" });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllTradeInRequests({ status, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set("status", status);
    return jsonReq(`?${params}`);
}

export async function appraiseTradeIn(id, payload) {
    return jsonReq(`/${id}/appraise`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function rejectTradeIn(id, adminNote) {
    return jsonReq(`/${id}/reject`, { method: "PUT", body: JSON.stringify({ adminNote }) });
}