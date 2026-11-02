import { PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createRenderLoop } from '../../src/scene/renderLoop'

// Controles falsos: como OrbitControls, `update()` solo avisa con 'change' cuando la cámara se movió.
const setup = (onFrame?: () => void) => {
  const listeners: Array<() => void> = []
  let tick: (() => void) | null = null
  let renders = 0
  const renderer = {
    setAnimationLoop: (cb: (() => void) | null) => void (tick = cb),
    render: () => void renders++,
  }
  const controls = {
    update: () => undefined,
    addEventListener: (_type: 'change', listener: () => void) => void listeners.push(listener),
  }
  const loop = createRenderLoop(renderer, new Scene(), new PerspectiveCamera(), controls, onFrame)
  return {
    loop,
    frame: () => tick?.(),
    isRunning: () => tick !== null,
    renders: () => renders,
    emitChange: () => listeners.forEach((l) => l()),
  }
}

describe('createRenderLoop', () => {
  it('dibuja el primer fotograma', () => {
    const t = setup()
    t.frame()
    expect(t.renders()).toBe(1)
  })

  it('no dibuja mientras nada cambia', () => {
    const t = setup()
    t.frame()
    t.frame()
    t.frame()
    expect(t.renders()).toBe(1)
  })

  it('dibuja tras invalidate()', () => {
    const t = setup()
    t.frame()
    t.loop.invalidate()
    t.frame()
    expect(t.renders()).toBe(2)
  })

  it("dibuja si los controles avisan con 'change' fuera de update() (rueda y arrastre)", () => {
    const t = setup()
    t.frame()
    t.emitChange()
    t.frame()
    expect(t.renders()).toBe(2)
  })

  it('llama a onFrame en cada fotograma, dibuje o no, y dibuja si pide invalidar', () => {
    let frames = 0
    let wantsRender = false
    const t = setup(() => {
      frames++
      if (wantsRender) t.loop.invalidate()
    })
    t.frame() // el primero dibuja siempre
    t.frame()
    expect(frames).toBe(2)
    expect(t.renders()).toBe(1)
    wantsRender = true
    t.frame()
    expect(t.renders()).toBe(2)
  })

  it('dispose() detiene el bucle', () => {
    const t = setup()
    expect(t.isRunning()).toBe(true)
    t.loop.dispose()
    expect(t.isRunning()).toBe(false)
  })
})
