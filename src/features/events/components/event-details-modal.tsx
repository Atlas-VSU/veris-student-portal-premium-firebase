'use client'

import React from 'react'
import type { Event } from '../types'
import { formatDate } from '@/lib/date-format'

interface EventDetailsModalProps {
  event: Event | null
  onClose: () => void
}

export function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  if (!event) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                A.Y. {event.academicYear} • {event.semester} Sem
              </span>
              {event.majorEvent && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 flex items-center gap-1">
                  ⭐ Major Event
                </span>
              )}
              {event.orgName && (
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {event.orgName}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white leading-snug">{event.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Status & Info grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Host Organization</span>
              <span className="text-slate-200 font-medium">{event.orgName || 'University Org'}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Status</span>
              <span className="text-slate-200 font-medium capitalize">{event.status}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Scheduled Date</span>
              <span className="text-slate-200 font-medium">{formatDate(event.date)}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Venue / Location</span>
              <span className="text-slate-200 font-medium">{event.location || 'Campus'}</span>
            </div>
          </div>

          {/* Time Windows */}
          <div className="space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Attendance Windows</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                <span className="text-slate-400 block mb-1">Time-In Window</span>
                <span className="text-white font-medium">
                  {event.timeInStart || '—'} - {event.timeInEnd || '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                <span className="text-slate-400 block mb-1">Time-Out Window</span>
                <span className="text-white font-medium">
                  {event.timeOutStart || '—'} - {event.timeOutEnd || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions / Notes */}
          {event.note && (
            <div className="space-y-1.5 text-xs">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Special Instructions</h4>
              <p className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-300 leading-relaxed whitespace-pre-wrap">
                {event.note}
              </p>
            </div>
          )}

          {/* Fine Policy notice if applicable */}
          {event.fineTypeId && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <svg className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Attendance Required:</strong> Non-attendance for this event will incur an assessed fine infraction in accordance with the host organization&apos;s fine policy.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
