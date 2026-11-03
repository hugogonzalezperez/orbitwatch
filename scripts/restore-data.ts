// Restaura public/data/ desde el sitio publicado (SITE_URL). Termina con error si no puede: ver scripts/ci-data.sh.
import { restoreData } from './restoreData'

const baseUrl = process.env.SITE_URL
if (!baseUrl) throw new Error('Falta SITE_URL, la dirección del sitio publicado')
const manifest = await restoreData({ baseUrl, out: process.argv[2] ?? 'public/data' })
console.log(`Datos restaurados de ${baseUrl}: ${manifest.catalog.count} objetos, generados el ${manifest.generatedAt.toISOString()}`)
