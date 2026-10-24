import assert from 'node:assert/strict'
import test from 'node:test'
import type { Firestore } from 'firebase-admin/firestore'
import { queryEligibleEvents } from '../src/features/events/usecases/query-eligible-events.ts'

function createDb(fail = false) {
  const queries: Array<Array<[string, string, unknown]>> = []
  let active = 0
  let maximumActive = 0
  const db = {
    collection(name: string) {
      assert.equal(name, 'events')
      const filters: Array<[string, string, unknown]> = []
      queries.push(filters)
      const query = {
        where(field: string, operator: string, value: unknown) {
          filters.push([field, operator, value])
          return query
        },
        async get() {
          active += 1
          maximumActive = Math.max(maximumActive, active)
          await new Promise((resolve) => setTimeout(resolve, 1))
          active -= 1
          if (fail) throw new Error('Query failed')
          return { docs: [{ id: String(queries.indexOf(filters)) }] }
        },
      }
      return query
    },
  } as unknown as Pick<Firestore, 'collection'>
  return { db, queries, maximumActive: () => maximumActive }
}

test('empty organization scope performs no queries', async () => {
  const mock = createDb()
  assert.deepEqual(await queryEligibleEvents(mock.db, { eligibleOrganizationIds: [] }), [])
  assert.equal(mock.queries.length, 0)
})

test('deduplicates IDs, chunks at 30, and bounds queries to five', async () => {
  const mock = createDb()
  const ids = Array.from({ length: 181 }, (_, index) => `org-${index}`)
  const docs = await queryEligibleEvents(mock.db, {
    eligibleOrganizationIds: [...ids, ...ids],
    academicYear: '2026-2027',
    semester: '1',
  })
  assert.equal(docs.length, 7)
  assert.equal(mock.maximumActive(), 5)
  assert.deepEqual(mock.queries.map((filters) => (filters[1][2] as string[]).length), [30, 30, 30, 30, 30, 30, 1])
  assert.deepEqual(mock.queries.flatMap((filters) => filters[1][2]), ids)
  for (const filters of mock.queries) {
    assert.deepEqual(filters[0], ['isDeleted', '==', false])
    assert.deepEqual(filters[1].slice(0, 2), ['orgId', 'in'])
    assert.deepEqual(filters.slice(2), [
      ['academicYear', '==', '2026-2027'],
      ['semester', '==', '1'],
    ])
  }
})

test('applies only the supplied term filters', async () => {
  for (const term of [{}, { academicYear: '2026' }, { semester: '2' }]) {
    const mock = createDb()
    await queryEligibleEvents(mock.db, { eligibleOrganizationIds: ['org'], ...term })
    assert.deepEqual(mock.queries[0].slice(2), Object.entries(term).map(([key, value]) => [key, '==', value]))
  }
})

test('propagates query failures without an unscoped fallback', async () => {
  const mock = createDb(true)
  await assert.rejects(queryEligibleEvents(mock.db, { eligibleOrganizationIds: ['org'] }), /Query failed/)
  assert.equal(mock.queries.length, 1)
})
