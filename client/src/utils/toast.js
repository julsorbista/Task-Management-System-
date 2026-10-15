let addToast = null

export function connectToastList(addFunction) {
  addToast = addFunction
}

export function showToast(text) {
  if (addToast) addToast(text)
}
