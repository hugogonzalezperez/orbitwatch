# Licencias y créditos de terceros

El código de OrbitWatch es MIT (ver [LICENSE](LICENSE)). Lo que sigue no es código propio y se rige por su propia licencia. Este documento recoge lo que de verdad se distribuye con la web (el paquete de JavaScript, las fuentes, las texturas) y lo que se usa solo para desarrollar.

## Texturas de la Tierra

| Qué | Origen | Licencia |
| --- | --- | --- |
| Mapa de día (8K y 2K), nubes (2K), brillo del mar (2K) en `public/textures/earth/` | [Solar System Scope](https://www.solarsystemscope.com/textures/), basadas en imágenes de la NASA | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

**Cambios realizados** (la licencia exige indicarlos): las imágenes originales de 8K se convierten a KTX2 con compresión ETC1S y mipmaps con `scripts/build-textures.sh`; las nubes y el brillo del mar se reducen a 2K y a un solo canal. No se modifica el contenido de otra forma. La atribución sale en el pie de la web.

## Datos orbitales

Los elementos orbitales proceden de [CelesTrak](https://celestrak.org/) (API GP, formato OMM en JSON), que los publica de acceso público. El proyecto respeta su [política de uso](https://celestrak.org/usage-policy.php): una descarga por actualización, parar ante cualquier respuesta distinta de 200 y ninguna petición desde el navegador (detalle en [docs/DATOS.md](docs/DATOS.md)). No se afirma ni se ha comprobado ninguna licencia concreta para estos datos; se cita la fuente en el pie de la web. `tests/fixtures/stations.json` contiene una copia de 20 objetos reales para las pruebas.

## Fuentes tipográficas (se distribuyen con la web)

| Fuente | Autoría | Licencia | Paquete |
| --- | --- | --- | --- |
| IBM Plex Sans (400 y 600, subconjunto latino) | © 2019 IBM Corp. | [SIL Open Font License 1.1](https://openfontlicense.org/) | `@fontsource/ibm-plex-sans` |
| Source Serif 4 (variable, subconjunto latino) | Google Inc. (según el aviso del paquete) | [SIL Open Font License 1.1](https://openfontlicense.org/) | `@fontsource-variable/source-serif-4` |

La licencia OFL permite incluir las fuentes en una web sin cambiarlas y exige conservar sus avisos de copyright; el texto completo está en el `LICENSE` de cada paquete dentro de `node_modules`.

## Bibliotecas que van en el paquete de JavaScript

| Biblioteca | Versión | Licencia | Para qué |
| --- | --- | --- | --- |
| [three.js](https://threejs.org/) | 0.187 | MIT | Render 3D, controles de cámara, cargador KTX2 |
| [React](https://react.dev/) y react-dom | 19.3 | MIT | Paneles de la interfaz |
| [satellite.js](https://github.com/shashwatak/satellite-js) | 7.1 | MIT | Propagación SGP4, tiempo sidéreo, posición del Sol, sombra de la Tierra |

Junto al paquete se distribuye también el descodificador de texturas Basis Universal (`basis_transcoder.js` y `.wasm`), que three.js incluye en `examples/jsm/libs/basis/` y que Vite copia a `dist/assets/`. Es un proyecto de [Binomial LLC](https://github.com/BinomialLLC/basis_universal) con su propia licencia, que no se ha revisado en este proyecto; conviene comprobarla antes de redistribuir el sitio fuera de este repositorio.

## Solo para desarrollo (no se distribuyen)

Vite (MIT), Vitest (MIT), TypeScript (Apache-2.0), tsx (MIT), `@vitejs/plugin-react` (MIT) y los tipos `@types/*` (MIT). Las versiones exactas están en `package-lock.json`, que también recoge las dependencias indirectas de cada una.

## Herramientas externas para regenerar las texturas

`scripts/build-textures.sh` usa `toktx` (KTX-Software) y Pillow en la máquina de quien lo ejecute; no forman parte del repositorio y cada una tiene su propia licencia.
