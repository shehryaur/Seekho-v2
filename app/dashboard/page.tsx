import { AppShellNav } from "@/components/AppShellNav";
import SyllabusRoadmap from "@/components/SyllabusRoadmap";

export const metadata = {
  title: "Seekho Engine · Roadmap",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-shell-gradient">
      <AppShellNav />
      <SyllabusRoadmap />
    </main>
  );
}
