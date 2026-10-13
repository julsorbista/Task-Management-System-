import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationDestination } from '../src/utils/notificationDestination.js'

test('notification links work before the board and task lists finish loading', () => {
  assert.equal(notificationDestination({ task: 'task-1', page: 'board-1' }), '/pages/board-1/list?task=task-1')
  assert.equal(notificationDestination({ page: 'board-2' }), '/pages/board-2/list')
  assert.equal(notificationDestination({ invitation: 'invite-1' }), '/invitations?id=invite-1')
  assert.equal(notificationDestination({ task: 'task-1' }, [{ _id: 'task-1', page: 'board-1' }]), '/pages/board-1/list?task=task-1')
  assert.equal(notificationDestination({ message: 'Older notification' }), null)
})
