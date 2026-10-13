const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Task = require('../models/Task')
const { updateTask } = require('../controllers/taskController')

test('viewers cannot change completion even for assigned or unassigned tasks; editors and owners can', async (t) => {
  const user = new mongoose.Types.ObjectId()
  const board = new mongoose.Types.ObjectId()
  const task = new Task({ board, title: 'Test', createdBy: user, assignee: user })
  const old = Task.findOne
  Task.findOne = async () => task
  t.after(() => { Task.findOne = old })
  let saves = 0
  task.save = async () => { saves++; return task }
  async function request(body, boardRole = 'viewer') {
    const req = { body, boardRole, user: { id: String(user) }, board: { _id: board }, params: { taskId: String(task._id) } }
    const res = { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
    await updateTask(req, res, (error) => { throw error })
    return res
  }
  assert.equal((await request({ title: 'Changed' })).code, 403)
  assert.equal((await request({ status: 'done', priority: 'high' })).code, 403)
  assert.equal((await request({ status: 'in-progress' })).code, 403)
  assert.equal((await request({ status: 'done' })).code, 403)
  task.assignee = new mongoose.Types.ObjectId()
  assert.equal((await request({ status: 'done' })).code, 403)
  task.assignee = null
  assert.equal((await request({ status: 'done' })).code, 403)
  assert.equal((await request({ status: 'todo' })).code, 403)
  assert.equal(saves, 0)
  assert.equal((await request({ status: 'done' }, 'editor')).code, 200)
  assert.equal(task.status, 'done')
  assert.equal((await request({ status: 'todo' }, 'owner')).code, 200)
  assert.equal(task.completedAt, '')
  assert.equal(saves, 2)
})
