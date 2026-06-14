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
          rgba(22, 163, 74, 0.10),
          rgba(132, 204, 22, 0.08) 28%,
          rgba(34, 197, 94, 0.05) 45%,
          transparent 65%)`,
            }}
        />
    );
}
