"use client";

import * as React from "react";

interface MagneticButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    strength?: number;
}

export function MagneticButton({
    children,
    strength = 0.2,
    className = "",
    ...rest
}: MagneticButtonProps) {
    const ref = React.useRef<HTMLButtonElement>(null);
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });

    function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        setOffset({ x, y });
    }

    function handleLeave() {
        setOffset({ x: 0, y: 0 });
    }

    return (
        <button
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className={className}
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            {...rest}
        >
            {children}
        </button>
    );
}
