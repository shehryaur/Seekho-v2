import { AppShellNav } from "@/components/AppShellNav";
import WeeklyBatchPlanner from "@/components/WeeklyBatchPlanner";

export const metadata = { title: "Seekho Engine · Plan My Week" };

export default function WeeklyPlannerPage() {
  return (
    <main className="seekho-site-shell min-h-screen bg-shell-gradient">
      <AppShellNav />
      <WeeklyBatchPlanner />
    </main>
  );
}
