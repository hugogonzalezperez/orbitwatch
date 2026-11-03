import type { ClassifiedRecord } from '../../src/satellites/data/assemble'
import { encodeColumns, toOrbitInput } from '../../src/satellites/data/columns'
import { parseOmmList, type OmmRecord } from '../../src/satellites/data/omm'
import raw from '../fixtures/stations.json'

/** Los 20 objetos reales de CelesTrak (grupo stations) guardados como dato de prueba. */
export const stationsRaw: unknown = raw
export const stationRecords = (): OmmRecord[] => parseOmmList(raw).records
export const issRecord = (): OmmRecord => stationRecords().find((r) => r.NORAD_CAT_ID === 25544)!

/** Las columnas de un catálogo de prueba con esos registros, todos en la misma categoría. */
/** Un registro ya clasificado, con propietario, tipo, estado y lanzamiento de prueba (lo que sale del script de datos). */
export const classified = (record: OmmRecord, category = 'stations', meta: Partial<Omit<ClassifiedRecord, 'record' | 'category'>> = {}): ClassifiedRecord => ({
  record,
  category,
  owner: 'US',
  type: 'PAY',
  status: '+',
  launch: '2020-01-01',
  ...meta,
})
export const columnsOf = (records: OmmRecord[], category = 'stations') => encodeColumns(records.map((record) => classified(record, category)))
/** Lo que recibe el Worker para esos registros. */
export const inputOf = (records: OmmRecord[]) => toOrbitInput(columnsOf(records))
