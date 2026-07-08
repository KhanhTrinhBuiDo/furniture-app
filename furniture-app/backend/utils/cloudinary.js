/**
 * Tối ưu URL ảnh Cloudinary bằng cách chèn transformation f_auto,q_auto
 * (tự chọn định dạng ảnh tối ưu theo trình duyệt + tự nén chất lượng hợp lý)
 * ngay sau đoạn "/upload/" trong URL — không cần upload lại ảnh, không tốn
 * thêm dung lượng lưu trữ, chỉ tối ưu ở bước tải về.
 *
 * Nếu không phải URL Cloudinary (ảnh ngoài, link Unsplash cũ,...) thì trả về
 * nguyên văn, không đụng vào.
 *
 * @param {string} url - URL ảnh gốc
 * @param {{ width?: number }} [opts] - tuỳ chọn thêm w_<width> để giảm kích thước tải theo ngữ cảnh hiển thị
 */
export function optimizeCloudinaryUrl(url, opts = {}) {
    if (!url || typeof url !== "string") return url;
    if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;

    const transforms = ["f_auto", "q_auto"];
    if (opts.width) transforms.push(`w_${opts.width}`);

    return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}