import { useEffect, useRef, useState } from 'react'
import { createEngine } from '../app/engine'

// React solo aloja el canvas: el motor 3D vive fuera del ciclo de render de React.
export function GlobeCanvas() {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    try {
      return createEngine(ref.current!)
    } catch (error) {
      console.error(error)
      setFailed(true) // normalmente: el navegador no puede crear un contexto WebGL
    }
  }, [])
  if (failed) return <p role="alert" className="globe-error">No se pudo iniciar WebGL, así que el globo 3D no se puede mostrar en este navegador.</p>
  return <div ref={ref} className="globe" />
}
