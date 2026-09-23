import assert from 'node:assert/strict'
import test from 'node:test'

import { isJsonRequest, isSameOriginRequest } from '../src/features/auth/request-security.ts'
import { getSafeRedirectPath } from '../src/features/auth/redirects.ts'
import {
  isRecentSignIn,
  isTerminalSessionError,
} from '../src/features/auth/session-security.ts'

test('session API accepts only same-origin requests', () => {
  const sameOrigin = new Request('https://portal.example/api/auth/session', {
    headers: { origin: 'https://portal.example' },
  })
  const crossOrigin = new Request('https://portal.example/api/auth/session', {
    headers: { origin: 'https://attacker.example' },
  })
  const missingOrigin = new Request('https://portal.example/api/auth/session')

  assert.equal(isSameOriginRequest(sameOrigin), true)
  assert.equal(isSameOriginRequest(crossOrigin), false)
  assert.equal(isSameOriginRequest(missingOrigin), false)
})

test('session API requires JSON content', () => {
  const jsonRequest = new Request('https://portal.example/api/auth/session', {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
  const formRequest = new Request('https://portal.example/api/auth/session', {
    headers: { 'content-type': 'text/plain' },
  })

  assert.equal(isJsonRequest(jsonRequest), true)
  assert.equal(isJsonRequest(formRequest), false)
})

test('post-login redirects remain on the portal origin', () => {
  assert.equal(getSafeRedirectPath('/attendance?term=active#latest'), '/attendance?term=active#latest')
  assert.equal(getSafeRedirectPath('https://attacker.example'), '/')
  assert.equal(getSafeRedirectPath('//attacker.example'), '/')
  assert.equal(getSafeRedirectPath('/\\attacker.example'), '/')
})

test('session exchange accepts only recent authentication', () => {
  const now = 1_800_000_000

  assert.equal(isRecentSignIn(now, now), true)
  assert.equal(isRecentSignIn(now - 300, now), true)
  assert.equal(isRecentSignIn(now - 301, now), false)
  assert.equal(isRecentSignIn(now + 60, now), true)
  assert.equal(isRecentSignIn(now + 61, now), false)
})

test('only terminal session errors are treated as already signed out', () => {
  assert.equal(isTerminalSessionError({ code: 'auth/session-cookie-expired' }), true)
  assert.equal(isTerminalSessionError({ code: 'auth/session-cookie-revoked' }), true)
  assert.equal(isTerminalSessionError({ code: 'auth/internal-error' }), false)
  assert.equal(isTerminalSessionError(new Error('network failure')), false)
})
