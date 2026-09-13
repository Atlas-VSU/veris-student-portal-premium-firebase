import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Active Academic Term: 2025-2026 • 1st Semester
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to the VERIS Student Portal
          </h1>

          <p className="text-slate-400 text-base leading-relaxed">
            Monitor and settle your organizational obligations, verify semester clearance, view event attendance records, and manage your student profile.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            <Link
              href="/clearance"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all group"
            >
              <div className="text-blue-400 mb-2 font-semibold text-sm flex items-center justify-between">
                <span>Clearance Status</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <p className="text-slate-400 text-xs">
                View your clearance checklist and settle fee or fine requirements.
              </p>
            </Link>

            <Link
              href="/events"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all group"
            >
              <div className="text-blue-400 mb-2 font-semibold text-sm flex items-center justify-between">
                <span>Events & Attendance</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <p className="text-slate-400 text-xs">
                Browse student events and review your logged attendance records.
              </p>
            </Link>

            <Link
              href="/profile"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all group"
            >
              <div className="text-blue-400 mb-2 font-semibold text-sm flex items-center justify-between">
                <span>Student Profile</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <p className="text-slate-400 text-xs">
                Verify your enrolled academic program and account identity.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

