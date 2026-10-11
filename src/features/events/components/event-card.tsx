'use client'

import React from 'react'
import type { Event } from '../types'
import { formatDate } from '@/lib/date-format'

interface EventCardProps {
  event: Event
  onSelect: (event: Event) => void
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const getStatusBadge = () => {
    switch (event.status) {
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ongoing
          </span>
        )
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Upcoming
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
            Completed
          </span>
        )
      case 'archived':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-500 border border-zinc-800">
            Archived
          </span>
        )
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900/90 transition-all flex flex-col justify-between group">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {event.majorEvent && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 flex items-center gap-1">
                ⭐ Major Event
              </span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Organizing Org Tag */}
        {event.orgName && (
          <div className="text-[11px] font-medium text-blue-400/90 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="truncate">{event.orgName}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {event.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {event.note || 'No additional instructions provided for this event.'}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{formatDate(event.date)}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location || 'Campus / TBD'}</span>
          </div>

          {(event.timeInStart || event.timeInEnd) && (
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">
                Check-in: {event.timeInStart || '—'} - {event.timeInEnd || '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          {event.attendees ?? 0} {event.attendees === 1 ? 'attendee' : 'attendees'} logged
        </span>
        <button
          type="button"
          onClick={() => onSelect(event)}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <span>Details</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </div>
  )
}
