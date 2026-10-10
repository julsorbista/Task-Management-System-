// toast.js
// Show a success message ("toast") at the top of the screen from any file:
//   import { showToast } from '../utils/toast.js'
//   showToast('Task added')
//
// The messages themselves are drawn by ToastList (components/Toast.jsx),
// which App.jsx puts on the screen once.

// The function that adds a message to the list. ToastList fills it in.
let addToast = null

// Called by ToastList when it appears (and with null when it goes away)
export function connectToastList(addFunction) {
  addToast = addFunction
}

export function showToast(text) {
  if (addToast) addToast(text)
}
