'use client'

import React, { useEffect, useState, useRef } from 'react'
import { getAllTermsAction, getActiveTermAction } from '../actions'
import type { Term, TermFilter } from '../types'

interface TermSelectorProps {
  onTermChange: (filter: TermFilter) => void
  allowAllTerms?: boolean
  className?: string
  defaultToActive?: boolean
}

export function TermSelector({
  onTermChange,
  allowAllTerms = true,
  className = '',
  defaultToActive = true,
}: TermSelectorProps) {
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('ACTIVE')
  const [loading, setLoading] = useState<boolean>(true)
  const onTermChangeRef = useRef(onTermChange)

  useEffect(() => {
    onTermChangeRef.current = onTermChange
  }, [onTermChange])

  useEffect(() => {
    let isMounted = true

    async function loadTerms() {
      try {
        const [allRes, activeRes] = await Promise.all([
          getAllTermsAction(),
          getActiveTermAction(),
        ])

        if (!isMounted) return

        if (allRes.ok && allRes.data) {
          setTerms(allRes.data)
        }

        if (defaultToActive && activeRes.ok && activeRes.data) {
          setSelectedKey(`${activeRes.data.AY}_${activeRes.data.semester}`)
          onTermChangeRef.current({
            academicYear: activeRes.data.AY,
            semester: activeRes.data.semester,
          })
        } else if (allowAllTerms && !defaultToActive) {
          setSelectedKey('ALL')
          onTermChangeRef.current({})
        }
      } catch (err) {
        console.error('Failed to load terms in selector:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadTerms()

    return () => {
      isMounted = false
    }
  }, [defaultToActive, allowAllTerms])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedKey(val)

    if (val === 'ALL') {
      onTermChange({})
      return
    }

    const [ay, sem] = val.split('_')
    if (!ay || (sem !== '1st' && sem !== '2nd')) {
      return
    }

    onTermChange({
      academicYear: ay,
      semester: sem,
    })
  }

  if (loading) {
    return (
      <div className={`h-9 w-48 bg-slate-900/80 border border-slate-800 rounded-lg animate-pulse ${className}`} />
    )
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <label htmlFor="term-select" className="sr-only">
        Select Academic Term
      </label>
      <div className="relative w-full">
        <select
          id="term-select"
          value={selectedKey}
          onChange={handleSelectChange}
          className="w-full appearance-none bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-medium rounded-lg pl-3 pr-8 py-2 hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
        >
          {allowAllTerms && <option value="ALL">All Academic Terms (Full History)</option>}
          {terms.map((t) => (
            <option key={t.id} value={`${t.AY}_${t.semester}`}>
              A.Y. {t.AY} • {t.semester} Semester {t.isActive ? ' (Active 🌟)' : ''}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
