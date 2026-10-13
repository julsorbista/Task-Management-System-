// Poll only the lightweight notification endpoint; keep the workspace on screen.
export function startNotificationRefresh(refresh, { browser = window, document = browser.document, interval = 10000 } = {}) {
  let stopped = false
  let pending = false
  async function check() {
    if (stopped || pending || document.visibilityState === 'hidden') return
    pending = true
    try { await refresh() } catch { /* Keep existing notifications during connection errors. */ }
    finally { pending = false }
  }
  const timer = browser.setInterval(check, interval)
  browser.addEventListener('focus', check)
  document.addEventListener('visibilitychange', check)
  check()
  return () => {
    stopped = true
    browser.clearInterval(timer)
    browser.removeEventListener('focus', check)
    document.removeEventListener('visibilitychange', check)
  }
}
