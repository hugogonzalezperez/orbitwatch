export type ObjectType = 'PAY' | 'R/B' | 'DEB' | 'UNK'

/** Lo que el SATCAT de CelesTrak dice de un objeto y los elementos orbitales no: quién es, qué es y desde cuándo está. */
export interface SatcatRow {
  type: ObjectType
  /** Código de estado operativo (`+` operativo, `P`, `B`, `S`, `X`, `-`...); vacío en los restos. */
  status: string
  /** Código del propietario o país. */
  owner: string
  /** Fecha de lanzamiento, AAAA-MM-DD. */
  launch: string
}

/** Dirección del SATCAT completo en CSV; se actualiza una o dos veces al día. */
export const SATCAT_URL = 'https://celestrak.org/pub/satcat.csv'

const NEEDED = ['NORAD_CAT_ID', 'OBJECT_TYPE', 'OPS_STATUS_CODE', 'OWNER', 'LAUNCH_DATE'] as const
const TYPES: readonly string[] = ['PAY', 'R/B', 'DEB']

/** Separa una línea CSV en campos, con comillas dobles (y `""` dentro de ellas) como en el estándar. */
function splitLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      fields.push(field)
      field = ''
    } else field += char
  }
  fields.push(field)
  return fields
}

/** Lee el CSV del SATCAT por el nombre de sus columnas y devuelve una fila por número de catálogo. */
export function parseSatcat(csv: string): Map<number, SatcatRow> {
  const lines = csv.split(/\r?\n/)
  const header = splitLine(lines[0] ?? '')
  const column = Object.fromEntries(NEEDED.map((name) => [name, header.indexOf(name)])) as Record<(typeof NEEDED)[number], number>
  const missing = NEEDED.filter((name) => column[name] === -1)
  if (missing.length > 0) throw new Error(`Al SATCAT le faltan columnas: ${missing.join(', ')}`)
  const rows = new Map<number, SatcatRow>()
  for (let i = 1; i < lines.length; i++) {
    const fields = splitLine(lines[i]!)
    const id = Number(fields[column.NORAD_CAT_ID])
    if (!Number.isInteger(id) || id <= 0) continue
    const type = fields[column.OBJECT_TYPE]!
    rows.set(id, {
      type: TYPES.includes(type) ? (type as ObjectType) : 'UNK',
      status: fields[column.OPS_STATUS_CODE] ?? '',
      owner: fields[column.OWNER] ?? '',
      launch: fields[column.LAUNCH_DATE] ?? '',
    })
  }
  return rows
}
