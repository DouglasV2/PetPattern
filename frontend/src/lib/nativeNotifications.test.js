// Native reminder scheduling LOGIC, verified against a mocked Capacitor LocalNotifications plugin.
// This exercises the JS decisions (per-pet slot, skip-today-after-check-in, no-clobber, non-silent
// failure status) — it does NOT verify real on-device delivery, permission prompts, or DST
// re-anchoring, which require a device/emulator not available in this environment.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reminderNotificationId } from './reminderSchedule'
import { markNotificationOpened, consumeNotificationConversion } from '../analytics'

let plugin

function installCapacitor() {
  plugin = {
    cancel: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  }
  globalThis.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: { LocalNotifications: plugin }
  }
}

describe('syncNativeReminder', () => {
  beforeEach(() => { vi.resetModules(); installCapacitor() })
  afterEach(() => { delete globalThis.Capacitor; vi.restoreAllMocks(); vi.useRealTimers() })

  it('cancels this pet slot then schedules a daily repeat with a safe, neutral payload', async () => {
    const { syncNativeReminder } = await import('./nativeNotifications')
    const status = await syncNativeReminder(
      { enabled: true, time: '19:00' }, 'Bella', { petId: 'pet-a', loggedToday: false })
    expect(status).toBe('scheduled')

    const id = reminderNotificationId('pet-a')
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id }] })
    const scheduled = plugin.schedule.mock.calls[0][0].notifications[0]
    expect(scheduled.id).toBe(id)
    expect(scheduled.schedule.repeats).toBe(true)
    expect(scheduled.schedule.every).toBe('day')
    expect(scheduled.extra.petId).toBe('pet-a')
    expect(scheduled.extra.kind).toBe('daily-checkin-reminder')
    expect(scheduled.body).toContain('Bella') // only the owner-chosen name, no health detail
  })

  it('only cancels (never schedules) when the reminder is disabled', async () => {
    const { syncNativeReminder } = await import('./nativeNotifications')
    const status = await syncNativeReminder({ enabled: false, time: '19:00' }, 'Bella', { petId: 'pet-a' })
    expect(status).toBe('cancelled')
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  it('gives each pet its own slot so multi-pet reminders never clobber each other', async () => {
    const { syncNativeReminder } = await import('./nativeNotifications')
    await syncNativeReminder({ enabled: true, time: '19:00' }, 'Bella', { petId: 'pet-a' })
    await syncNativeReminder({ enabled: true, time: '19:00' }, 'Milo', { petId: 'pet-b' })
    const idA = plugin.schedule.mock.calls[0][0].notifications[0].id
    const idB = plugin.schedule.mock.calls[1][0].notifications[0].id
    expect(idA).not.toBe(idB)
  })

  it('skips today and anchors tomorrow after a qualifying check-in (loggedToday)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 18, 0, 0)) // 18:00 local, reminder at 19:00
    const { syncNativeReminder } = await import('./nativeNotifications')
    await syncNativeReminder({ enabled: true, time: '19:00' }, 'Bella', { petId: 'pet-a', loggedToday: true })
    const at = plugin.schedule.mock.calls[0][0].notifications[0].schedule.at
    expect(at.getDate()).toBe(2) // tomorrow — it must NOT fire again tonight after a check-in
  })

  it('reports an error status (not a silent swallow) when scheduling throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    plugin.schedule.mockRejectedValueOnce(new Error('boom'))
    const { syncNativeReminder } = await import('./nativeNotifications')
    const status = await syncNativeReminder({ enabled: true, time: '19:00' }, 'Bella', { petId: 'pet-a' })
    expect(status).toBe('error')
    expect(warn).toHaveBeenCalled()
  })

  it('is a no-op ("unavailable") on the web with no Capacitor plugin', async () => {
    delete globalThis.Capacitor
    vi.resetModules()
    const { syncNativeReminder } = await import('./nativeNotifications')
    expect(await syncNativeReminder({ enabled: true, time: '19:00' }, 'Bella', { petId: 'pet-a' })).toBe('unavailable')
  })
})

describe('notification -> check-in conversion attribution', () => {
  it('consumes a recent open exactly once', () => {
    markNotificationOpened()
    expect(consumeNotificationConversion()).toBe(true)
    expect(consumeNotificationConversion()).toBe(false) // already attributed
  })

  it('does not convert without a preceding open', () => {
    // consume any leftover state, then confirm a clean read is false
    consumeNotificationConversion()
    expect(consumeNotificationConversion()).toBe(false)
  })

  it('does not convert an open outside the window', () => {
    markNotificationOpened()
    expect(consumeNotificationConversion(-1)).toBe(false)
  })
})
