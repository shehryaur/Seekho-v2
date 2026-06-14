import { notFound } from "next/navigation";
import { getLessonByToken, type LessonJson } from "@/lib/supabase";
import { PrintLayout } from "@/components/PrintLayout";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: PageProps) {
  const { id } = await params;
  const row = await getLessonByToken(id);
  if (!row) notFound();

  let lesson: LessonJson;
  try {
    lesson = JSON.parse(row.content) as LessonJson;
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-cream">
      <PrintLayout
        lesson={lesson!}
        meta={{
          school: row.school_name,
          classNum: row.class_num,
          subject: row.subject,
          chapter: row.chapter,
          district: row.district,
        }}
      />
    </main>
  );
}
