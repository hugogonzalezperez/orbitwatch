import { useEffect, useState } from 'react'

const HIDE_AFTER_MS = 20_000

/** Ayuda de primer uso: dice qué se puede hacer y desaparece en cuanto el usuario toca algo (o pasado un rato). */
export function Hint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const hide = () => setVisible(false)
    const timer = setTimeout(hide, HIDE_AFTER_MS)
    for (const type of ['pointerdown', 'wheel', 'keydown'] as const) window.addEventListener(type, hide, { once: true })
    return () => {
      clearTimeout(timer)
      for (const type of ['pointerdown', 'wheel', 'keydown'] as const) window.removeEventListener(type, hide)
    }
  }, [])
  if (!visible) return null
  return <p className="hint">Arrastra para girar la Tierra, usa la rueda para acercar y pulsa un punto para ver su satélite.</p>
}
