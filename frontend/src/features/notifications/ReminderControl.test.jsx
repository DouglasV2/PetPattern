// Native reminder LIFECYCLE across an app restart (WP1), verified against a mocked Capacitor
// LocalNotifications + App plugin. This exercises the JS lifecycle decisions — check-permission on
// start, re-schedule a saved+granted reminder after a cold restart, and skip today's occurrence
// after a check-in while keeping the recurring daily reminder. It does NOT verify real on-device
// delivery / OS permission prompts, which need a device not available here.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup, fireEvent, screen } from '@testing-library/react'
import { ReminderControl } from './ReminderControl'

let plugin
let appPlugin

function installCapacitor(displayPermission = 'granted') {
  plugin = {
    checkPermissions: vi.fn().mockResolvedValue({ display: displayPermission }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  }
  appPlugin = { addListener: vi.fn().mockReturnValue({ remove: vi.fn() }) }
  globalThis.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: { LocalNotifications: plugin, App: appPlugin }
  }
}

// Flush the chain of async effects (permission check -> setState -> re-render -> schedule effect).
async function flush() {
  for (let i = 0; i < 8; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve() })
  }
}

const pet = { id: 'pet-a', name: 'Bella', species: 'DOG' }
const STORAGE_KEY = 'petpattern.reminder.pet-a'

describe('ReminderControl native reminder lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 18, 0, 0)) // 18:00 local, before the 19:00 default time
    localStorage.clear()
    installCapacitor('granted')
  })
  afterEach(() => {
    cleanup()
    delete globalThis.Capacitor
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('enabling requests permission, persists the preference, and schedules a daily reminder', async () => {
    plugin.checkPermissions.mockResolvedValue({ display: 'prompt' }) // not yet granted
    render(<ReminderControl pet={pet} loggedToday={false} />)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: /Daily reminder/i }))
    await flush()

    expect(plugin.requestPermissions).toHaveBeenCalled()
    expect(plugin.schedule).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).enabled).toBe(true)
  })

  it('after a cold restart, re-checks permission and re-schedules the saved+granted reminder', async () => {
    // Simulate a previously-enabled reminder persisted across a restart.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, time: '19:00' }))

    render(<ReminderControl pet={pet} loggedToday={false} />) // "app restarts"
    await flush()

    // checkPermissions() runs on start (no prompt), and the still-granted reminder is re-scheduled.
    expect(plugin.checkPermissions).toHaveBeenCalled()
    expect(plugin.requestPermissions).not.toHaveBeenCalled() // never prompt on a silent restart
    expect(plugin.schedule).toHaveBeenCalled()

    const scheduled = plugin.schedule.mock.calls.at(-1)[0].notifications[0]
    expect(scheduled.schedule.repeats).toBe(true)   // the recurring daily reminder is active
    expect(scheduled.schedule.every).toBe('day')
    expect(scheduled.schedule.at.getDate()).toBe(1) // today 19:00 (18:00 now, not yet logged)
  })

  it("today's check-in cancels only today's occurrence; the future daily reminder stays active", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, time: '19:00' }))

    render(<ReminderControl pet={pet} loggedToday />) // already logged today
    await flush()

    expect(plugin.cancel).toHaveBeenCalled() // this pet's slot is cancelled before (re)scheduling
    const scheduled = plugin.schedule.mock.calls.at(-1)[0].notifications[0]
    expect(scheduled.schedule.at.getDate()).toBe(2) // anchored to TOMORROW — today is skipped
    expect(scheduled.schedule.repeats).toBe(true)   // but the daily reminder itself remains
    expect(scheduled.schedule.every).toBe('day')
  })

  it('a since-revoked (denied) permission drops the control out of its stale "on" state', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, time: '19:00' }))
    installCapacitor('denied') // permission revoked in system settings while the app was closed

    render(<ReminderControl pet={pet} loggedToday={false} />)
    await flush()

    expect(plugin.schedule).not.toHaveBeenCalled() // nothing is scheduled without permission
    // The preference is flipped off so the UI can't keep claiming a reminder the OS won't deliver.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).enabled).toBe(false)
  })
})
