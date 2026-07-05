"use client";

import { useEffect, useState } from "react";

export function CursorSpotlight() {
    const [pos, setPos] = useState({ x: -400, y: -400 });
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(pointer: fine)");
        setEnabled(mq.matches);

        if (!mq.matches) return;
        const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener("mousemove", move);
        return () => window.removeEventListener("mousemove", move);
    }, []);

    if (!enabled) return null;

    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
            style={{
                background: `radial-gradient(640px circle at ${pos.x}px ${pos.y}px,
          rgba(22, 220, 95, 0.22),
          rgba(20, 28, 173, 0.13) 28%,
          rgba(4, 245, 92, 0.05) 45%,
          transparent 65%)`,
            }}
        />
    );
}
