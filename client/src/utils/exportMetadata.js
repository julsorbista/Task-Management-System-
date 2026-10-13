export function exportMetadata(user, date = new Date()) {
  const timestamp = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date)
  return { title: 'Morrow Tasks', dateTime: `${timestamp} (PHT)`, exportedBy: user.name || user.email }
}
