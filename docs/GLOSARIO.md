# Glosario

Los términos técnicos que aparecen en la documentación y en el código.

**SGP4.** *Simplified General Perturbations 4*: el modelo matemático estándar para calcular dónde está un satélite en un instante dado a partir de unos pocos números llamados elementos orbitales. Tiene en cuenta efectos como el achatamiento de la Tierra y el rozamiento de la atmósfera. Lo usan NORAD y todas las herramientas de seguimiento de satélites. Aquí lo ejecuta la biblioteca `satellite.js`. Su precisión es de kilómetros y empeora al alejarse de la época de los elementos.

**Elementos orbitales / OMM.** Los números que describen la órbita de un objeto en un momento (la *época*): movimiento medio, excentricidad, inclinación, etc. OMM (*Orbit Mean-Elements Message*) es el formato JSON en que CelesTrak los publica. Sustituye a TLE, que no admite números de catálogo de 6 dígitos.

**Época.** El instante al que se refieren los elementos orbitales. Cuanto más lejos de la época se calcula, menos fiable es la posición.

**NORAD / número de catálogo.** Identificador numérico único de cada objeto en órbita (la ISS es el 25544).

**TEME / ECI.** Sistemas de coordenadas inerciales: no giran con la Tierra. SGP4 devuelve posiciones en TEME. OrbitWatch dibuja en ese marco (la cámara no se mueve y la Tierra gira), así que no hay que convertir cada posición.

**GMST.** *Greenwich Mean Sidereal Time*: el ángulo que ha girado la Tierra respecto a las estrellas en un instante. Se usa para girar el globo y para pasar de coordenadas inerciales a latitud y longitud.

**Geoestacionario / geosíncrono.** Órbita a ~35 786 km de altura en la que el satélite tarda un día en dar una vuelta, el mismo tiempo que tarda la Tierra en girar. Si además es casi ecuatorial, parece quieto sobre un punto del suelo.

**LEO, MEO.** Órbita baja (menos de 2 000 km) y media. La ISS y Starlink están en órbita baja; el GPS, en media.

**Perigeo / apogeo.** El punto más bajo y el más alto de una órbita elíptica.

**Worker (Web Worker).** Un programa de JavaScript que el navegador ejecuta en un hilo aparte, en paralelo a la página. La página (el hilo principal) se encarga de dibujar y de responder al ratón; si hace un cálculo largo, se congela. Un Worker hace el cálculo en segundo plano y le manda el resultado cuando termina, sin bloquear nada. No comparte variables con la página: se comunican con mensajes.

**Extrapolación.** Estimar dónde estará algo un poco después a partir de su posición y velocidad actuales: `posición + velocidad × tiempo`. Aquí se usa entre dos cálculos de SGP4; el error es menor de un kilómetro durante 15 segundos de tiempo simulado.

**Shader / vertex shader.** Programa que se ejecuta en la tarjeta gráfica. El *vertex shader* decide dónde se dibuja cada punto; hacerlo ahí es muy barato porque la GPU procesa miles de puntos a la vez.

**Render a demanda.** Dibujar solo cuando algo ha cambiado (cámara, tiempo, selección), para no gastar GPU con la imagen quieta.

**KTX2 / Basis.** Formato de textura que se queda comprimida en la memoria de la tarjeta gráfica (en lugar de ocupar cientos de MB como un PNG de 8K).

**CelesTrak.** Sitio que publica los elementos orbitales actuales de los objetos en órbita, de acceso público.

**SATCAT.** Catálogo de objetos de CelesTrak con datos que los elementos orbitales no traen: propietario, tipo (carga útil, resto, cuerpo de cohete), fecha de lanzamiento y estado.
