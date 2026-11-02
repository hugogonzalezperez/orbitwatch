import { parseOmmList, type OmmRecord } from '../../src/satellites/data/omm'
import raw from '../fixtures/stations.json'

/** Los 20 objetos reales de CelesTrak (grupo stations) guardados como dato de prueba. */
export const stationsRaw: unknown = raw
export const stationRecords = (): OmmRecord[] => parseOmmList(raw).records
export const issRecord = (): OmmRecord => stationRecords().find((r) => r.NORAD_CAT_ID === 25544)!
