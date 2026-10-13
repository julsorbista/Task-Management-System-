import test from 'node:test'
import assert from 'node:assert/strict'
import { createTaskPdf } from '../src/utils/taskPdf.js'

test('PDF contains export metadata and preserves tasks across multiple pages', () => {
  const pdf = createTaskPdf({
    columns: ['Title', 'Description', 'Due date', 'Due time', 'Priority', 'Status', 'Page', 'Scope', 'Assignee'],
    rows: Array.from({ length: 100 }, (_, index) => [`Task ${index + 1}`, 'Description', '2026-10-14', '10:00', 'High', 'To Do', 'IT', 'Shared', 'Juliana Orbista']),
    exportedBy: { name: 'Juliana Orbista', email: 'user@example.com' },
    exportedAt: new Date('2026-10-13T14:12:00Z'),
  })
  const output = pdf.output()
  assert.match(output, /^%PDF-/)
  assert.match(output, /Morrow Tasks/)
  assert.match(output, /Date and Time:/)
  assert.match(output, /10:12 PM/)
  assert.match(output, /Exported by: Juliana Orbista/)
  assert.match(output, /Task 1\)/)
  assert.match(output, /Task 100\)/)
  assert.ok(pdf.getNumberOfPages() > 1)
  assert.doesNotMatch(output, /localhost|vercel\.app|about:blank/)
})
