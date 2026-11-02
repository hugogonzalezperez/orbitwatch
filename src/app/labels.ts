/** Etiquetas de texto sobre el globo, en el DOM y sin pasar por React: se recolocan en cada fotograma. */
export interface Labels {
  /** Nombre del seleccionado; `null` la oculta. */
  setSelected(name: string | null): void
  /** Dónde está el seleccionado en el lienzo (píxeles CSS); `null` si no se ve (lo tapa la Tierra o sale del encuadre). Con `left`, el nombre va a su izquierda. */
  placeSelected(point: { x: number; y: number } | null, left?: boolean): void
  /** Nombre bajo el puntero; `null` la oculta. */
  hover(name: string | null, point?: { x: number; y: number }): void
  dispose(): void
}

export function createLabels(container: HTMLElement): Labels {
  const make = (className: string): HTMLElement => {
    const element = document.createElement('div')
    element.className = `sat-label ${className}`
    element.hidden = true
    container.appendChild(element)
    return element
  }
  const selected = make('sat-label-selected')
  const hovered = make('sat-label-hover')
  const place = (element: HTMLElement, point: { x: number; y: number }, left = false) => {
    element.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px)${left ? ' translateX(-100%)' : ''}`
    element.classList.toggle('left', left)
  }
  let selectedName: string | null = null
  let selectedPoint: { x: number; y: number } | null = null
  let selectedLeft = false
  const showSelected = () => {
    selected.hidden = selectedName === null || selectedPoint === null
    if (!selected.hidden) place(selected, selectedPoint!, selectedLeft)
  }

  return {
    setSelected(name) {
      selectedName = name
      selected.textContent = name
      showSelected()
    },
    placeSelected(point, left = false) {
      selectedPoint = point
      selectedLeft = left
      showSelected()
    },
    hover(name, point) {
      hovered.hidden = name === null || point === undefined
      if (hovered.hidden) return
      hovered.textContent = name
      place(hovered, point!)
    },
    dispose() {
      selected.remove()
      hovered.remove()
    },
  }
}
