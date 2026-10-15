let addToast = null

export function connectToastList(addFunction) {
  addToast = addFunction
}

export function showToast(text, type = 'success') {
  if (addToast) addToast(text, type)
}
