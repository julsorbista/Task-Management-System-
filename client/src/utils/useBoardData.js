import { useEffect, useRef, useState } from 'react'
import { getPage, getTasksByPage, getUsers, getCurrentUser } from '../api/api.js'
import { workspaceSnapshot } from './workspaceSnapshot.js'

function cachedBoard(pageId) {
  if (workspaceSnapshot.boards[pageId]) return workspaceSnapshot.boards[pageId]
  const page = workspaceSnapshot.pages.find((item) => item._id === pageId)
  if (!page || !workspaceSnapshot.loaded) return null
  return { page: { ...page, members: page.members || [] }, tasks: workspaceSnapshot.tasks.filter((item) => item.page === pageId),
    users: workspaceSnapshot.users, currentUser: workspaceSnapshot.user }
}

// Keep cached content visible during navigation and refresh permissions in the background.
export default function useBoardData(pageId, reloadCount) {
  const revisions = useRef({})
  const [state, setState] = useState(() => ({ pageId, data: cachedBoard(pageId), error: '' }))
  const data = state.pageId === pageId ? state.data : cachedBoard(pageId)
  useEffect(() => {
    let active = true
    const revision = revisions.current[pageId] || 0
    Promise.all([getPage(pageId), getTasksByPage(pageId), getUsers(), getCurrentUser()])
      .then(([page, tasks, users, currentUser]) => {
        if (!active) return
        const latest = cachedBoard(pageId)
        const fresh = { page, tasks: revision !== (revisions.current[pageId] || 0) && latest ? latest.tasks : tasks, users, currentUser }
        workspaceSnapshot.boards[pageId] = fresh
        workspaceSnapshot.users = users
        setState({ pageId, data: fresh, error: '' })
      }).catch((error) => {
        if (!active) return
        // Discard cached content when access has been revoked.
        delete workspaceSnapshot.boards[pageId]
        setState({ pageId, data: null, error: error.message || 'Failed to load tasks.' })
      })
    return () => { active = false }
  }, [pageId, reloadCount])

  function setTasks(update) {
    revisions.current[pageId] = (revisions.current[pageId] || 0) + 1
    setState((previous) => {
      const current = previous.pageId === pageId ? previous.data : cachedBoard(pageId)
      if (!current) return previous
      const tasks = typeof update === 'function' ? update(current.tasks) : update
      const next = { ...current, tasks }
      workspaceSnapshot.boards[pageId] = next
      workspaceSnapshot.tasks = [...workspaceSnapshot.tasks.filter((item) => item.page !== pageId), ...tasks]
      return { pageId, data: next, error: '' }
    })
  }

  return { page: data?.page || null, tasks: data?.tasks || [], users: data?.users || [],
    currentUser: data?.currentUser || null, setTasks,
    hasLoaded: Boolean(data) || Boolean(state.pageId === pageId && state.error),
    loadError: state.pageId === pageId ? state.error : '' }
}
