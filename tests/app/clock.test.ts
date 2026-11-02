import { describe, expect, it } from 'vitest'
import { animationIntervalMs, createClock, stepSpeed } from '../../src/app/clock'

// Reloj real falso: lo avanzamos a mano.
const setup = (start?: Date) => {
  let real = Date.parse('2026-11-01T12:00:00Z')
  const clock = createClock({ now: () => real, start })
  return { clock, advance: (ms: number) => void (real += ms), real: () => real }
}

describe('createClock', () => {
  it('arranca en la hora real, en directo y a velocidad 1', () => {
    const { clock, real } = setup()
    expect(clock.time().getTime()).toBe(real())
    expect(clock.state()).toEqual({ speed: 1, paused: false, live: true })
  })

  it('a velocidad 60 el tiempo simulado avanza 60 veces más rápido', () => {
    const { clock, advance } = setup()
    const t0 = clock.time().getTime()
    clock.setSpeed(60)
    advance(1000)
    expect(clock.time().getTime() - t0).toBe(60_000)
    expect(clock.state().live).toBe(false)
  })

  it('con velocidad negativa el tiempo retrocede', () => {
    const { clock, advance } = setup()
    const t0 = clock.time().getTime()
    clock.setSpeed(-10)
    advance(2000)
    expect(clock.time().getTime() - t0).toBe(-20_000)
  })

  it('cambiar la velocidad no da saltos: se conserva la hora que había', () => {
    const { clock, advance } = setup()
    advance(5000)
    const before = clock.time().getTime()
    clock.setSpeed(3600)
    expect(clock.time().getTime()).toBe(before)
  })

  it('en pausa la hora no avanza y al reanudar sigue desde ahí', () => {
    const { clock, advance } = setup()
    advance(1000)
    clock.pause()
    const frozen = clock.time().getTime()
    advance(60_000)
    expect(clock.time().getTime()).toBe(frozen)
    expect(clock.state().paused).toBe(true)
    clock.resume()
    advance(1000)
    expect(clock.time().getTime()).toBe(frozen + 1000)
  })

  it('jumpTo fija la hora y el reloj sigue corriendo desde ella', () => {
    const { clock, advance } = setup()
    clock.jumpTo(new Date('2026-12-25T00:00:00Z'))
    advance(1000)
    expect(clock.time().toISOString()).toBe('2026-12-25T00:00:01.000Z')
  })

  it('resetToNow vuelve a la hora real, en directo, a velocidad 1 y sin pausa, desde cualquier estado', () => {
    const { clock, advance, real } = setup()
    clock.setSpeed(-86400)
    advance(10_000)
    clock.pause()
    clock.resetToNow()
    expect(clock.time().getTime()).toBe(real())
    expect(clock.state()).toEqual({ speed: 1, paused: false, live: true })
    advance(500)
    expect(clock.time().getTime()).toBe(real())
  })

  it('con hora inicial propia no está en directo hasta volver a ahora', () => {
    const { clock, real } = setup(new Date('2026-03-20T14:46:00Z'))
    expect(clock.time().toISOString()).toBe('2026-03-20T14:46:00.000Z')
    expect(clock.state().live).toBe(false)
    clock.resetToNow()
    expect(clock.time().getTime()).toBe(real())
    expect(clock.state().live).toBe(true)
  })

  it('con paused: true la hora inicial queda fija hasta reanudar', () => {
    let real = 0
    const clock = createClock({ now: () => real, start: new Date('2026-03-20T14:46:00Z'), paused: true })
    real += 60_000
    expect(clock.time().toISOString()).toBe('2026-03-20T14:46:00.000Z')
    expect(clock.state().paused).toBe(true)
  })

  it('state() devuelve el mismo objeto mientras no cambie nada (para useSyncExternalStore)', () => {
    const { clock, advance } = setup()
    const a = clock.state()
    advance(10_000)
    expect(clock.state()).toBe(a)
    clock.setSpeed(2)
    expect(clock.state()).not.toBe(a)
  })

  it('avisa a los suscriptores al cambiar el estado, no al pasar el tiempo, y deja de avisar al darse de baja', () => {
    const { clock, advance } = setup()
    let calls = 0
    const unsubscribe = clock.subscribe(() => calls++)
    advance(5000)
    clock.time()
    expect(calls).toBe(0)
    clock.setSpeed(10)
    clock.pause()
    clock.resume()
    clock.jumpTo(new Date(0))
    clock.resetToNow()
    expect(calls).toBe(5)
    unsubscribe()
    clock.setSpeed(2)
    expect(calls).toBe(5)
  })
})

describe('stepSpeed', () => {
  it('hacia adelante sube por la escala y se queda en el máximo', () => {
    expect(stepSpeed(1, +1)).toBe(10)
    expect(stepSpeed(600, +1)).toBe(3600)
    expect(stepSpeed(86400, +1)).toBe(86400)
  })

  it('hacia atrás baja por la escala, pasa a negativo y se queda en el mínimo', () => {
    expect(stepSpeed(10, -1)).toBe(1)
    expect(stepSpeed(1, -1)).toBe(-1)
    expect(stepSpeed(-1, -1)).toBe(-10)
    expect(stepSpeed(-86400, -1)).toBe(-86400)
  })

  it('desde una velocidad que no está en la escala va a la más cercana en esa dirección', () => {
    expect(stepSpeed(30, +1)).toBe(60)
    expect(stepSpeed(30, -1)).toBe(10)
  })
})

describe('animationIntervalMs', () => {
  it('a 1x basta con redibujar cada segundo', () => {
    expect(animationIntervalMs(1)).toBe(1000)
    expect(animationIntervalMs(-1)).toBe(1000)
  })

  it('por encima de 1x hay que dibujar en cada fotograma', () => {
    expect(animationIntervalMs(10)).toBe(0)
    expect(animationIntervalMs(-3600)).toBe(0)
  })
})
