import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
      <main className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          VERIS Student Portal
        </h1>
        <p className="text-slate-400 text-sm">
          Welcome to the VERIS Student Self-Service Portal. View your fees, fines, attendance, and clearance status.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/clearance"
            className="px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-300 text-sm font-medium transition-colors"
          >
            Check Clearance
          </Link>
        </div>
      </main>
    </div>
  );
}
