import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
            <div className="text-slate-400 text-sm animate-pulse">Loading login form...</div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}

