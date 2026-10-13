import test from 'node:test'
import assert from 'node:assert/strict'
import { startNotificationRefresh } from './notificationRefresh.js'

test('notification polling skips hidden tabs and overlapping requests and cleans up', async () => {
  const browser = new EventTarget()
  const document = new EventTarget()
  document.visibilityState = 'visible'
  let tick, delay, cleared = false, calls = 0, finish
  browser.setInterval = (callback, interval) => { tick = callback; delay = interval; return 1 }
  browser.clearInterval = (id) => { assert.equal(id, 1); cleared = true }
  const stop = startNotificationRefresh(() => {
    calls++
    return new Promise((resolve) => { finish = resolve })
  }, { browser, document })
  assert.equal(delay, 10000)
  assert.equal(calls, 1)
  browser.dispatchEvent(new Event('focus'))
  await tick()
  assert.equal(calls, 1)
  finish()
  await Promise.resolve()
  document.visibilityState = 'hidden'
  await tick()
  assert.equal(calls, 1)
  document.visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(calls, 2)
  finish()
  await Promise.resolve()
  stop()
  browser.dispatchEvent(new Event('focus'))
  document.dispatchEvent(new Event('visibilitychange'))
  await tick()
  assert.equal(calls, 2)
  assert.equal(cleared, true)
})
