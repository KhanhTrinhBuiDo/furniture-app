import { useEffect, useState } from "react";
import { useStore } from "../../../store/store";
import styles from "./Toast.module.css";

// ─── Toast component ─────────────────────────────────────────────────────────
// Reads `toast` from store: { message, type } | null
// type: "success" | "error" | "info"

const ICONS = { success: "✓", error: "✕", info: "i" };

export default function Toast() {
    const { toast } = useStore();
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (!toast) {
            setVisible(false);
            setExiting(false);
            return;
        }
        setExiting(false);
        setVisible(true);
        // start exit animation 300ms before store clears it
        const exitTimer = setTimeout(() => setExiting(true), 2200);
        return () => clearTimeout(exitTimer);
    }, [toast]);

    if (!visible || !toast) return null;

    const msg = typeof toast === "string" ? toast : toast.message;
    const type = typeof toast === "string" ? "success" : (toast.type || "success");

    return (
        <div
            className={`${styles.toast} ${exiting ? styles.toastExit : styles.toastEnter}`}
            data-type={type}
            role="alert"
            aria-live="polite"
        >
            <div className={styles.icon}>{ICONS[type] || ICONS.info}</div>
            <p className={styles.message}>{msg}</p>
        </div>
    );
}