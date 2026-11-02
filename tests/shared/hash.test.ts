import { describe, expect, it } from 'vitest'
import { sha256Hex } from '../../src/shared/hash'

describe('sha256Hex', () => {
  it('da el SHA-256 conocido de «abc» y el de la cadena vacía', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('trabaja sobre los bytes UTF-8: un acento cuenta como dos', async () => {
    expect(await sha256Hex('é')).toBe(await sha256Hex(new TextEncoder().encode('é')))
    expect(await sha256Hex('é')).not.toBe(await sha256Hex('e'))
  })

  it('acepta bytes directamente y da 64 caracteres hexadecimales', async () => {
    const hash = await sha256Hex(new Uint8Array([1, 2, 3]))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
