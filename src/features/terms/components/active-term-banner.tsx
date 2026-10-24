'use client'

import React, { useEffect, useState } from 'react'
import { getActiveTermAction } from '../actions'
import type { Term } from '../types'

interface ActiveTermBannerProps {
  initialTerm?: Term | null
  className?: string
}

export function ActiveTermBanner({ initialTerm = null, className = '' }: ActiveTermBannerProps) {
  const [term, setTerm] = useState<Term | null>(initialTerm)
  const [loading, setLoading] = useState<boolean>(!initialTerm)

  useEffect(() => {
    let isMounted = true

    async function fetchActiveTerm() {
      try {
        const res = await getActiveTermAction()
        if (isMounted && res.ok && res.data) {
          setTerm(res.data)
        }
      } catch (err) {
        console.error('Failed to resolve active term banner:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (!initialTerm) {
      void fetchActiveTerm()
    }

    return () => {
      isMounted = false
    }
  }, [initialTerm])

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 animate-pulse ${className}`}>
        <span className="w-2 h-2 rounded-full bg-slate-600" />
        <span className="text-slate-400 text-xs font-medium">Resolving active academic term...</span>
      </div>
    )
  }

  if (!term) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium ${className}`}>
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Academic Term Not Configured</span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium shadow-sm shadow-blue-500/5 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
      <span className="font-semibold text-white">Active Academic Term:</span>
      <span className="text-blue-200">
        A.Y. {term.AY} • {term.semester} Semester
      </span>
    </div>
  )
}
