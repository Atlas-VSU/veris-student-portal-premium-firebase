'use client'

import React, { useState, useMemo } from 'react'
import type { AttendanceHistoryItem, AttendanceStatus } from '../types'
import { formatDate, formatTime } from '@/lib/date-format'

interface AttendanceHistoryTableProps {
  items: AttendanceHistoryItem[]
  loading?: boolean
}

export function AttendanceHistoryTable({ items, loading = false }: AttendanceHistoryTableProps) {
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = item.eventName?.toLowerCase().includes(q)
        const matchOrg = item.orgName?.toLowerCase().includes(q)
        const matchLoc = item.location?.toLowerCase().includes(q)
        const matchRemark = item.remark?.toLowerCase().includes(q)
        if (!matchName && !matchOrg && !matchLoc && !matchRemark) return false
      }
      return true
    })
  }, [items, statusFilter, search])

  const renderStatusBadge = (item: AttendanceHistoryItem) => {
    if (item.status === 'present') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Present
        </span>
      )
    }
    if (item.status === 'partially present') {
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Partially Present
          </span>
          {item.fineAmount !== undefined && item.fineAmount > 0 && (
            <span className="text-[10px] text-amber-300">
              ₱{item.fineAmount.toFixed(2)} fine
            </span>
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Absent
        </span>
        {item.fineAmount !== undefined && item.fineAmount > 0 && (
          <span className="text-[10px] text-rose-300">
            ₱{item.fineAmount.toFixed(2)} fine
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header with Search and Filter */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
        <div>
          <h3 className="text-base font-semibold text-white">Event Attendance & Participation Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified check-in scans, time logs, and absence infraction records across your affiliated organizations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'all')}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Records</option>
            <option value="present">Present Only</option>
            <option value="partially present">Partially Present Only</option>
            <option value="absent">Absent / Infractions Only</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Search event, org, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-7 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="p-8 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-lg w-full" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <svg className="w-8 h-8 mx-auto text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <div className="text-sm font-medium text-slate-300">No Attendance Records Found</div>
          <p className="text-xs text-slate-500">
            {search
              ? `No records matched your search "${search}".`
              : 'You have no logged attendance or absence records for the selected criteria.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Time-In</th>
                <th className="py-3 px-4">Time-Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-blue-400 whitespace-nowrap">
                    {item.orgName || 'University Org'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{item.eventName}</span>
                      {item.majorEvent && (
                        <span className="text-[10px] text-yellow-400 font-semibold" title="Major Event">
                          ⭐
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {formatDate(item.eventDate)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {item.location || 'Campus'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                    {item.timeIn ? formatTime(item.timeIn) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                    {item.timeOut ? (
                      formatTime(item.timeOut)
                    ) : item.status === 'absent' ? (
                      '—'
                    ) : (
                      <span className="text-slate-500 italic">Not Logged</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {renderStatusBadge(item)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{item.remark || '—'}</span>
                      {item.isPendingAppeal && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Appeal Pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
