import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { exportMetadata } from './exportMetadata.js'

export function createTaskPdf({ columns, rows, exportedBy, exportedAt = new Date() }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const metadata = exportMetadata(exportedBy, exportedAt)
  const name = metadata.exportedBy
  doc.setProperties({ title: 'Morrow Tasks', author: name })
  const exporterLines = doc.splitTextToSize(`Exported by: ${name}`, 182)
  const tableTop = 34 + exporterLines.length * 5
  autoTable(doc, {
    head: [columns], body: rows.map((row) => row.map((value) => String(value ?? ''))),
    theme: 'grid', startY: tableTop,
    margin: { top: tableTop, left: 14, right: 14, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak', textColor: 25, lineColor: 195, lineWidth: .2 },
    headStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' },
    rowPageBreak: 'avoid', showHead: 'everyPage',
    willDrawPage() {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('Morrow Tasks', 14, 19)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Date and Time: ${metadata.dateTime}`, 14, 27)
      doc.text(exporterLines, 14, 33)
    },
  })
  return doc
}
