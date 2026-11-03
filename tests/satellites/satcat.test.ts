import { describe, expect, it } from 'vitest'
import { parseSatcat } from '../../src/satellites/data/satcat'

const HEADER = 'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE'
// Filas reales del SATCAT de CelesTrak (2026-11-02).
const ROWS = [
  'ISS (ZARYA),1998-067A,25544,PAY,+,ISS,1998-11-20,TYMSC,,92.95,51.63,424,414,399.0524,,EA,ORB',
  'STARLINK-1008,2019-074B,44714,PAY,P,US,2019-11-11,AFETR,,91.81,53.14,364,362,,,EA,ORB',
  'FREGAT DEB,2011-037PF,49271,DEB,,CIS,2011-07-18,TYMSC,,115.61,51.66,2217,749,,,EA,ORB',
  'CREW DRAGON 13,2026-226A,100882,PAY,+,US,2026-10-02,AFETR,,92.95,51.63,424,414,,,25544,DOC',
]
const csv = [HEADER, ...ROWS].join('\n')

describe('parseSatcat', () => {
  it('lee tipo, estado, propietario y fecha de lanzamiento de cada objeto por su número de catálogo', () => {
    const satcat = parseSatcat(csv)
    expect(satcat.size).toBe(4)
    expect(satcat.get(25544)).toEqual({ type: 'PAY', status: '+', owner: 'ISS', launch: '1998-11-20' })
    expect(satcat.get(44714)).toEqual({ type: 'PAY', status: 'P', owner: 'US', launch: '2019-11-11' })
  })

  it('un resto no tiene estado: queda vacío', () => {
    expect(parseSatcat(csv).get(49271)).toEqual({ type: 'DEB', status: '', owner: 'CIS', launch: '2011-07-18' })
  })

  it('admite números de catálogo de 6 dígitos', () => {
    expect(parseSatcat(csv).get(100882)?.owner).toBe('US')
  })

  it('lee por el nombre de las columnas, no por su posición', () => {
    const reordered = 'NORAD_CAT_ID,OWNER,OBJECT_TYPE,LAUNCH_DATE,OPS_STATUS_CODE\n25544,ISS,PAY,1998-11-20,+'
    expect(parseSatcat(reordered).get(25544)).toEqual({ type: 'PAY', status: '+', owner: 'ISS', launch: '1998-11-20' })
  })

  it('con CRLF y una línea final vacía funciona igual', () => {
    expect(parseSatcat(`${csv.replaceAll('\n', '\r\n')}\r\n`).size).toBe(4)
  })

  it('un nombre entre comillas, con comas y comillas dentro, no descoloca las demás columnas', () => {
    const row = '"SAT, CON ""COMILLAS""",2020-001A,50000,PAY,+,JPN,2020-01-01,TNSTA,,100,98,500,490,,,EA,ORB'
    expect(parseSatcat(`${HEADER}\n${row}`).get(50000)).toEqual({ type: 'PAY', status: '+', owner: 'JPN', launch: '2020-01-01' })
  })

  it('un tipo que no se conoce queda como desconocido', () => {
    const row = 'X,2020-001A,50001,RARO,+,US,2020-01-01,AFETR,,100,98,500,490,,,EA,ORB'
    expect(parseSatcat(`${HEADER}\n${row}`).get(50001)?.type).toBe('UNK')
  })

  it('ignora las filas sin un número de catálogo válido', () => {
    const rows = [ROWS[0]!, 'MAL,2020-001A,no-es-un-numero,PAY,+,US,2020-01-01,AFETR,,1,1,1,1,,,EA,ORB', ',,,,,,,,,,,,,,,,']
    expect([...parseSatcat([HEADER, ...rows].join('\n')).keys()]).toEqual([25544])
  })

  it('si falta una columna necesaria, rechaza el fichero en vez de leer basura', () => {
    expect(() => parseSatcat('OBJECT_NAME,NORAD_CAT_ID\nISS,25544')).toThrow(/OWNER/)
    expect(() => parseSatcat('')).toThrow()
  })
})
