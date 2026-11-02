import { useEffect, useRef, useState } from 'react'
import { createEngine, type Engine } from '../app/engine'
import { parseStartTime } from '../app/startTime'

const WEBGL_ERROR =
  'No se pudo iniciar WebGL, así que el globo 3D no se puede mostrar. Activa la aceleración por hardware del navegador o prueba con otro.'

// React solo aloja el canvas: el motor 3D vive fuera del ciclo de render de React.
export function GlobeCanvas({ onEngine }: { onEngine: (engine: Engine | null) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let engine: Engine
    try {
      engine = createEngine(ref.current!, { startTime: parseStartTime(window.location.search) })
    } catch (error) {
      console.error(error)
      setFailed(true) // normalmente: el navegador no puede crear un contexto WebGL
      return
    }
    onEngine(engine)
    return () => {
      onEngine(null)
      engine.dispose()
    }
  }, [onEngine])
  if (failed) {
    return (
      <p role="alert" className="globe-error">
        {WEBGL_ERROR}
      </p>
    )
  }
  return <div ref={ref} className="globe" role="img" aria-label="Globo 3D con los satélites en órbita. Para elegir uno, usa el buscador o las listas de la izquierda." />
}
