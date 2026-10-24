'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMyAttendanceOverviewAction } from '../actions'
import type { AttendanceHistoryItem, AttendanceStats, TermFilter } from '../types'
import { TermSelector } from '@/features/terms/components/term-selector'
import { AttendanceStatsCards } from './attendance-stats-cards'
import { AttendanceHistoryTable } from './attendance-history-table'

export function AttendanceLedgerView() {
  const [historyItems, setHistoryItems] = useState<AttendanceHistoryItem[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [selectedTerm, setSelectedTerm] = useState<TermFilter | undefined>()

  useEffect(() => {
    let isMounted = true

    async function load() {
      setError(null)

      try {
        const result = await getMyAttendanceOverviewAction(selectedTerm)

        if (!isMounted) return

        if (result.ok) {
          setHistoryItems(result.data.history)
          setStats(result.data.stats)
        } else {
          setHistoryItems([])
          setStats(null)
          setError(result.error)
        }
      } catch (err) {
        console.error('Failed to load attendance ledger data:', err)
        if (isMounted) {
          setHistoryItems([])
          setStats(null)
          setError('Unable to load attendance. Please try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [selectedTerm, retryCount])

  const handleTermChange = (filter: TermFilter) => {
    setLoading(true)
    setSelectedTerm(filter)
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance & Check-in Ledger</h1>
          <p className="text-slate-400 text-xs mt-1">
            Review your verified attendance scans, absence infraction counters, and participation stats across your affiliated organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Browse Scheduled Events</span>
          </Link>
          <TermSelector onTermChange={handleTermChange} allowAllTerms={true} defaultToActive={true} />
        </div>
      </div>

      {error && !loading ? (
        <div
          role="alert"
          className="p-10 text-center rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3"
        >
          <h2 className="text-base font-semibold text-red-300">Attendance is unavailable</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setRetryCount((count) => count + 1)
            }}
            className="px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Aggregate Statistics Cards (FR-EVT-01) */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">
              Attendance Aggregate Statistics
            </h2>
            <AttendanceStatsCards stats={stats} loading={loading} />
          </section>

          {/* Chronological Attendance Ledger (FR-EVT-02) */}
          <section aria-labelledby="ledger-heading">
            <h2 id="ledger-heading" className="sr-only">
              Event Attendance History Ledger
            </h2>
            <AttendanceHistoryTable items={historyItems} loading={loading} />
          </section>
        </>
      )}
    </div>
  )
}
