import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MapPin,
  Printer,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AppShellNav } from "@/components/AppShellNav";
import LessonGenerator from "@/components/LessonGenerator";
import { AuroraBackground } from "@/components/effects/AuroraBackground";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const featureItems = [
  {
    icon: MapPin,
    title: "Real local context",
    body: "Seekho maps complex PCTB concepts to familiar regional examples, so abstract ideas land faster in real classrooms.",
  },
  {
    icon: Wand2,
    title: "Minute-by-minute pacing",
    body: "Every lesson pack includes a practical teaching timeline built for large classes, tight periods, and real school flow.",
  },
  {
    icon: Printer,
    title: "Budget-smart printing",
    body: "Get clean A4 layouts designed for local photocopiers, lower ink use, and easy parent sharing on WhatsApp.",
  },
];

const quickSteps = [
  "Select your exact PCTB class and chapter.",
  "Set your district and available classroom materials.",
  "Generate the complete daily lesson pack.",
  "Print the A4 worksheet or forward it to parents.",
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialValues = {
    classNum: typeof params.class === "string" ? params.class : "",
    subject: typeof params.subject === "string" ? params.subject : "",
    chapter: typeof params.chapter === "string" ? params.chapter : "",
  };

  return (
    <main className="seekho-site-shell min-h-screen bg-shell-gradient">
      <AppShellNav />

      <section className="relative overflow-hidden px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="seekho-hero-pattern relative isolate overflow-hidden rounded-[2rem] border border-white/60 px-6 py-10 shadow-[0_30px_120px_-48px_rgba(20,83,45,0.55)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <AuroraBackground intensity="soft" />
            <div className="seekho-grid-overlay absolute inset-0 opacity-70" />

            <div className="relative mx-auto max-w-4xl text-center">
              <div className="seekho-badge mx-auto mb-5 inline-flex items-center gap-2">
                
                PCTB-aligned automation for Punjab schools
              </div>

              <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-emerald-950 sm:text-6xl lg:text-7xl">
                Master the syllabus.
                <br />
                <span className="font-serif italic font-medium text-emerald-800">
                  Zero prep time.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-ink/72 sm:text-lg">
                Stop losing your evenings to paperwork.
              </p>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-ink/72 sm:text-lg">
                Seekho Engine builds
                complete daily lesson plans aligned to the Punjab Textbook
                Board with teacher guidance, student activities, quizzes, and
                classroom-ready structure in under 60 seconds.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/#lesson-generator"
                  className="seekho-btn-primary seekho-btn-xl"
                >
                  Start now
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-to-use"
                  className="seekho-btn-secondary seekho-btn-xl"
                >
                  <BookOpen className="h-4 w-4" />
                  See how it works
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-sm text-ink/72">
                <span className="seekho-chip">No evening prep work</span>
                <span className="seekho-chip">Real local examples</span>
                <span className="seekho-chip">Direct WhatsApp share</span>
                <span className="seekho-chip">
                  Automated lesson remediation
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="seekho-card p-6 sm:p-8">
            <div className="seekho-section-label">
              Why schools choose Seekho
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {featureItems.map((item, index) => (
                <article
                  key={item.title}
                  className="group rounded-[1.5rem] border border-emerald-700/15 bg-white/70 p-5 shadow-[0_18px_40px_-24px_rgba(20,83,45,0.4)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(20,83,45,0.4)]"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-200/60">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-ink">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink/72">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="seekho-card p-6 sm:p-8">
            <div className="seekho-section-label">Fast path</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
              Plan tomorrow&apos;s lesson right now.
            </h2>
            <div className="mt-5 space-y-3">
              {quickSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-emerald-700/15 bg-white/70 px-4 py-3 transition hover:border-emerald-700/35 hover:bg-white/85"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-ink/78">{step}</span>
                </div>
              ))}
            </div>
            <Link
              href="/how-to-use"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
            >
              View the walkthrough
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>

      <section
        id="lesson-generator"
        className="scroll-mt-28 px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="seekho-section-label">Core engine</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Generate your next lesson package instantly
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-50/80 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm backdrop-blur">
              <CheckCircle2 className="h-4 w-4" />
              Fully aligned with 2026 PCTB updates
            </div>
          </div>
        </div>
        <LessonGenerator initialValues={initialValues} />
      </section>

      <footer className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[1.75rem] border border-emerald-700/20 bg-white/65 px-6 py-5 text-sm text-ink/65 shadow-[0_20px_60px_-36px_rgba(20,83,45,0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 Seekho Engine. Empowering educators across Punjab.</div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="transition hover:text-ink">
              Syllabus Roadmap
            </Link>
            <Link href="/week" className="transition hover:text-ink">
              Weekly Planner
            </Link>
            <Link href="/how-to-use" className="transition hover:text-ink">
              Documentation
            </Link>
            <Link href="mailto:shehryar.hassan@uni.minerva.edu" className="transition hover:text-ink">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
