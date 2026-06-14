/**
 * app/plan/page.tsx
 *
 * Hosts the NEW 3-step weekly planner wizard.
 * URL: /plan
 */

import { AppShellNav } from "@/components/AppShellNav";
import WeeklyPlannerV2 from "@/components/WeeklyPlannerV2";

export const metadata = { title: "Seekho Engine · Plan my week" };

export default function PlanPage() {
    return (
        <main className="min-h-screen bg-shell-gradient">
            <AppShellNav />
            <WeeklyPlannerV2 />
        </main>
    );
}
