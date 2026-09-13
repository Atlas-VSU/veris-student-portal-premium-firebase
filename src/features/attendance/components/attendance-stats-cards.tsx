'use client'

import React from 'react'
import type { AttendanceStats } from '../types'

interface AttendanceStatsCardsProps {
  stats: AttendanceStats | null
  loading?: boolean
}

export function AttendanceStatsCards({ stats, loading = false }: AttendanceStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-800 rounded w-1/2" />
            <div className="h-8 bg-slate-800 rounded w-1/3" />
            <div className="h-3 bg-slate-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const presentCount = stats?.presentCount ?? 0
  const partialCount = stats?.partialCount ?? 0
  const totalAttended = stats?.totalAttended ?? (presentCount + partialCount)
  const absencesCount = stats?.absencesCount ?? 0
  const pendingAppealsCount = stats?.pendingAppealsCount ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Attended */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Events Attended</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight">{totalAttended}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total verified participation records</p>
        </div>
      </div>

      {/* 2. Full Attendance */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider">Full Attendance</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight">{presentCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Both Time-In & Time-Out logged</p>
        </div>
      </div>

      {/* 3. Partial Attendance */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">Partial Attendance</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight">{partialCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Single scan check-in record</p>
        </div>
      </div>

      {/* 4. Infractions / Absences */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-400/90 uppercase tracking-wider">Absences & Fines</span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-white tracking-tight">{absencesCount}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-[11px] text-slate-400">Event non-attendance infractions</p>
            {pendingAppealsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {pendingAppealsCount} in appeal
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
