import { describe, expect, it } from 'vitest'
import { createStore } from '../../src/shared/store'

describe('createStore', () => {
  it('guarda el valor y avisa solo cuando cambia', () => {
    const store = createStore(1)
    let calls = 0
    store.subscribe(() => calls++)
    store.set(2)
    store.set(2)
    expect(store.get()).toBe(2)
    expect(calls).toBe(1)
  })

  it('deja de avisar a quien se da de baja', () => {
    const store = createStore('a')
    let calls = 0
    const unsubscribe = store.subscribe(() => calls++)
    unsubscribe()
    store.set('b')
    expect(calls).toBe(0)
  })
})
