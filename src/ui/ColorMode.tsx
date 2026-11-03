import { type CSSProperties } from 'react'
import { REGIMES, type ColorMode as Mode } from '../satellites/regimes'
import { cssColor } from './format'

const OPTIONS: ReadonlyArray<{ mode: Mode; label: string }> = [
  { mode: 'category', label: 'Función' },
  { mode: 'regime', label: 'Órbita' },
]

/** Elige si el globo colorea por función (categoría) o por tipo de órbita; con órbita, muestra la clave de colores. */
export function ColorMode({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <fieldset className="color-mode">
      <legend>Colorear por</legend>
      <div className="segmented">
        {OPTIONS.map(({ mode, label }) => (
          <label key={mode}>
            <input type="radio" name="color-mode" value={mode} checked={value === mode} onChange={() => onChange(mode)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {value === 'regime' && (
        <ul className="regime-key" aria-label="Colores por tipo de órbita">
          {REGIMES.map(({ id, label, color }) => (
            <li key={id}>
              <i className="swatch" style={{ '--swatch': cssColor(color) } as CSSProperties} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
