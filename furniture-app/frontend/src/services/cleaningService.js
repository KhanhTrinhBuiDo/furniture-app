const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/cleaning`;

async function req(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
}

/** Danh sách đơn hàng đã giao thành công — để chọn khi đăng ký vệ sinh */
export async function getEligibleOrders() {
    return req("/eligible-orders");
}

/** Đăng ký vệ sinh miễn phí */
export async function createCleaningRequest(payload) {
    return req("/", { method: "POST", body: JSON.stringify(payload) });
}

/** Danh sách đăng ký của tôi */
export async function getMyCleaningRequests() {
    return req("/my");
}

/** Huỷ đăng ký */
export async function cancelCleaningRequest(id) {
    return req(`/${id}/cancel`, { method: "POST" });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllCleaningRequests({ status, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set("status", status);
    return req(`?${params}`);
}

export async function updateCleaningStatus(id, payload) {
    return req(`/${id}/status`, { method: "PUT", body: JSON.stringify(payload) });
}