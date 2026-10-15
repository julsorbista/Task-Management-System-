import { useEffect, useRef, useState } from 'react'
import { getPage, getTasksByPage, getUsers, getCurrentUser } from '../api/api.js'
import { workspaceSnapshot, publishWorkspaceChange } from './workspaceSnapshot.js'

function cachedBoard(pageId) {
  if (workspaceSnapshot.boards[pageId]) return workspaceSnapshot.boards[pageId]
  const page = workspaceSnapshot.pages.find((item) => item._id === pageId)
  if (!page || !workspaceSnapshot.loaded) return null
  return { page: { ...page, members: page.members || [] }, tasks: workspaceSnapshot.tasks.filter((item) => item.page === pageId),
    users: workspaceSnapshot.users, currentUser: workspaceSnapshot.user }
}

export default function useBoardData(pageId, reloadCount) {
  const revisions = useRef({})
  const [state, setState] = useState(() => ({ pageId, data: cachedBoard(pageId), error: '' }))
  const data = state.pageId === pageId ? state.data : cachedBoard(pageId)
  useEffect(() => {
    function handleBoardChanged(event) {
      if (event.detail.boardId !== pageId) return
      revisions.current[pageId] = (revisions.current[pageId] || 0) + 1
      const updated = cachedBoard(pageId)
      setState({ pageId, data: updated, error: updated ? '' : 'This board was deleted.' })
    }
    window.addEventListener('morrow-board-changed', handleBoardChanged)
    return () => window.removeEventListener('morrow-board-changed', handleBoardChanged)
  }, [pageId])
  useEffect(() => {
    let active = true
    const revision = revisions.current[pageId] || 0
    Promise.all([getPage(pageId), getTasksByPage(pageId), getUsers(), getCurrentUser()])
      .then(([page, tasks, users, currentUser]) => {
        if (!active) return
        const latest = cachedBoard(pageId)
        const changed = revision !== (revisions.current[pageId] || 0) && latest
        const fresh = { page: changed ? { ...page, name: latest.page.name } : page,
          tasks: changed ? latest.tasks : tasks, users, currentUser }
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
    const current = cachedBoard(pageId) || data
    if (!current) return
    const tasks = typeof update === 'function' ? update(current.tasks) : update
    const next = { ...current, tasks }
    workspaceSnapshot.boards[pageId] = next
    workspaceSnapshot.tasks = [...workspaceSnapshot.tasks.filter((item) => item.page !== pageId), ...tasks]
    setState({ pageId, data: next, error: '' })
    publishWorkspaceChange()
  }

  return { page: data?.page || null, tasks: data?.tasks || [], users: data?.users || [],
    currentUser: data?.currentUser || null, setTasks,
    hasLoaded: Boolean(data) || Boolean(state.pageId === pageId && state.error),
    loadError: state.pageId === pageId ? state.error : '' }
}
