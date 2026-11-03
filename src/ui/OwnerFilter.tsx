import { useId, useMemo } from 'react'
import type { Engine } from '../app/engine'
import { countByOwner } from '../satellites/catalog'
import { formatInteger } from './format'
import { useStore } from './hooks'

interface Props {
  engine: Engine
  /** Código de propietario elegido; vacío es «todos». */
  value: string
  onChange: (owner: string) => void
}

/** Limita lo que se ve —globo, lista y búsqueda— a los objetos de un país u operador. */
export function OwnerFilter({ engine, value, onChange }: Props) {
  const data = useStore(engine.data)
  const id = useId()
  const owners = useMemo(() => (data.kind === 'ready' ? countByOwner(data.catalog) : []), [data])
  if (data.kind !== 'ready') return null
  return (
    <div className="owner-filter">
      <label htmlFor={id}>País u operador</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos ({formatInteger(data.catalog.length)})</option>
        {owners.map(({ owner, name, count }) => (
          <option key={owner} value={owner}>
            {name} ({formatInteger(count)})
          </option>
        ))}
      </select>
    </div>
  )
}
