"use client";

interface AuroraProps {
  intensity?: "soft" | "vivid";
  className?: string;
}

export function AuroraBackground({
  intensity = "soft",
  className = "",
}: AuroraProps) {
  const opacity = intensity === "vivid" ? "opacity-70" : "opacity-40";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        className={`absolute -top-44 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full ${opacity} blur-3xl`}
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(22,163,74,0.78) 0deg, rgba(132,204,22,0.78) 120deg, rgba(20,184,166,0.5) 230deg, rgba(245,158,11,0.55) 320deg, rgba(22,163,74,0.78) 360deg)",
          animation: "aurora-spin 30s linear infinite",
        }}
      />
      <div
        className={`absolute -bottom-36 right-[-5%] h-[380px] w-[560px] rounded-full ${opacity} blur-3xl`}
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(34,197,94,0.5) 0deg, rgba(132,204,22,0.6) 140deg, rgba(22,163,74,0.7) 260deg, rgba(34,197,94,0.5) 360deg)",
          animation: "aurora-spin-reverse 38s linear infinite",
        }}
      />

      <style jsx>{`
        @keyframes aurora-spin {
          from {
            transform: translateX(-50%) rotate(0deg);
          }
          to {
            transform: translateX(-50%) rotate(360deg);
          }
        }
        @keyframes aurora-spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
