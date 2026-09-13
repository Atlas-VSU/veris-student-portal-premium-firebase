'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getEventsAction } from '../actions'
import type { Event, EventStatus, TermFilter } from '../types'
import { TermSelector } from '@/features/terms/components/term-selector'
import { EventCard } from './event-card'
import { EventDetailsModal } from './event-details-modal'

export function EventsCatalogView() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedTerm, setSelectedTerm] = useState<TermFilter | undefined>()
  const [statusTab, setStatusTab] = useState<EventStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeModalEvent, setActiveModalEvent] = useState<Event | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const res = await getEventsAction(selectedTerm)
        if (isMounted) {
          setEvents(res.ok && res.data ? res.data : [])
        }
      } catch (err) {
        console.error('Failed to fetch events catalog:', err)
        if (isMounted) setEvents([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [selectedTerm])

  const handleTermChange = (filter: TermFilter) => {
    setLoading(true)
    setSelectedTerm(filter)
  }

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusTab !== 'all' && e.status !== statusTab) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = e.name?.toLowerCase().includes(q)
        const matchesLocation = e.location?.toLowerCase().includes(q)
        const matchesNote = e.note?.toLowerCase().includes(q)
        if (!matchesName && !matchesLocation && !matchesNote) return false
      }
      return true
    })
  }, [events, statusTab, searchQuery])

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">University & Org Events</h1>
          <p className="text-slate-400 text-xs mt-1">
            Browse upcoming, ongoing, and past events across Program (L1), College (L2), and Apex (L3) organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/attendance"
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>My Attendance Ledger</span>
          </Link>
          <TermSelector onTermChange={handleTermChange} allowAllTerms={true} defaultToActive={true} />
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 text-xs overflow-x-auto">
          {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                statusTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab === 'all' ? 'All Events' : tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search events or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Events Grid / Loading / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-48 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse p-5 space-y-4"
            >
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/60 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">No Events Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No events matched your search query "${searchQuery}".`
              : 'There are no events scheduled for the selected term and status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onSelect={(e) => setActiveModalEvent(e)} />
          ))}
        </div>
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
      />
    </div>
  )
}
