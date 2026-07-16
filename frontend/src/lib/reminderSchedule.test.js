import { describe, it, expect } from 'vitest'
import { shouldRemind, nextReminderAt, localDateKey } from './reminderSchedule'

const at = (h, m) => new Date(2026, 2, 1, h, m, 0, 0) // 2026-03-01 local

describe('shouldRemind', () => {
  const base = { enabled: true, time: '19:00', permission: 'granted', loggedToday: false, lastNotifiedDate: null, now: at(19, 0) }

  it('fires when enabled, permitted, not logged, at/after the time, not yet nudged', () => {
    expect(shouldRemind(base)).toBe(true)
    expect(shouldRemind({ ...base, now: at(19, 30) })).toBe(true)
  })

  it('does not fire before the chosen time', () => {
    expect(shouldRemind({ ...base, now: at(18, 59) })).toBe(false)
  })

  it('does not fire when disabled, already logged today, or without permission', () => {
    expect(shouldRemind({ ...base, enabled: false })).toBe(false)
    expect(shouldRemind({ ...base, loggedToday: true })).toBe(false)
    expect(shouldRemind({ ...base, permission: 'default' })).toBe(false)
    expect(shouldRemind({ ...base, permission: 'denied' })).toBe(false)
  })

  it('does not fire twice on the same local day', () => {
    expect(shouldRemind({ ...base, lastNotifiedDate: localDateKey(at(19, 0)) })).toBe(false)
    // ...but a stale date from a previous day does not block today's nudge
    expect(shouldRemind({ ...base, lastNotifiedDate: '2026-02-28' })).toBe(true)
  })

  it('ignores a cleared or malformed time', () => {
    expect(shouldRemind({ ...base, time: '' })).toBe(false)
    expect(shouldRemind({ ...base, time: '7pm' })).toBe(false)
  })
})

describe('nextReminderAt', () => {
  it('is later the same day when the time is still ahead', () => {
    const next = nextReminderAt('19:00', at(18, 0))
    expect(next.getDate()).toBe(1)
    expect(next.getHours()).toBe(19)
  })

  it('rolls to tomorrow when the time has already passed', () => {
    const next = nextReminderAt('17:00', at(18, 0))
    expect(next.getDate()).toBe(2)
    expect(next.getHours()).toBe(17)
  })

  it('returns null for an invalid time', () => {
    expect(nextReminderAt('nope', at(18, 0))).toBeNull()
  })
})
