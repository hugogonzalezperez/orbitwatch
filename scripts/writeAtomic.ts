import { rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Escribe `dir/name` por un fichero temporal, para que nunca quede a medias. */
export async function writeAtomic(dir: string, name: string, text: string): Promise<void> {
  await writeFile(join(dir, `${name}.tmp`), text)
  await rename(join(dir, `${name}.tmp`), join(dir, name))
}
