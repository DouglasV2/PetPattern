import { describe, it, expect } from 'vitest'
import {
  shouldRemind,
  nextReminderAt,
  localDateKey,
  firstReminderAt,
  reminderNotificationId
} from './reminderSchedule'

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

describe('firstReminderAt (skip-today-after-check-in)', () => {
  it('skips today and fires tomorrow when already logged today and the time is still ahead', () => {
    // 18:00 now, 19:00 reminder, logged today -> must NOT fire tonight; anchor to tomorrow 19:00.
    const first = firstReminderAt('19:00', at(18, 0), true)
    expect(first.getDate()).toBe(2)
    expect(first.getHours()).toBe(19)
  })

  it('fires today when the time is ahead and NOT yet logged today', () => {
    const first = firstReminderAt('19:00', at(18, 0), false)
    expect(first.getDate()).toBe(1)
    expect(first.getHours()).toBe(19)
  })

  it('keeps tomorrow when the time already passed today, regardless of logged state', () => {
    expect(firstReminderAt('17:00', at(18, 0), false).getDate()).toBe(2)
    expect(firstReminderAt('17:00', at(18, 0), true).getDate()).toBe(2)
  })

  it('returns null for a cleared/invalid time', () => {
    expect(firstReminderAt('', at(18, 0), true)).toBeNull()
  })
})

describe('reminderNotificationId (per-pet slots)', () => {
  it('is stable for the same pet id', () => {
    expect(reminderNotificationId('pet-abc')).toBe(reminderNotificationId('pet-abc'))
  })

  it('differs between pets so multi-pet reminders never clobber each other', () => {
    expect(reminderNotificationId('pet-a')).not.toBe(reminderNotificationId('pet-b'))
  })

  it('is always a safe positive integer', () => {
    const id = reminderNotificationId('11111111-2222-3333-4444-555555555555')
    expect(Number.isInteger(id)).toBe(true)
    expect(id).toBeGreaterThan(0)
    expect(id).toBeLessThan(2 ** 31)
  })
})
