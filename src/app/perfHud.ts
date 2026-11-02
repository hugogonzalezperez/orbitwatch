/** Panel de texto con las métricas de rendimiento, en el DOM y sin pasar por React. */
export interface PerfHud {
  show(lines: string[]): void
  dispose(): void
}

export function createPerfHud(container: HTMLElement): PerfHud {
  const element = document.createElement('div')
  element.className = 'perf-hud'
  element.setAttribute('aria-hidden', 'true') // herramienta de medida, no contenido de la página
  container.appendChild(element)
  return {
    show: (lines) => void (element.textContent = lines.join('\n')),
    dispose: () => element.remove(),
  }
}
