---
name: OrbitWatch
description: Un globo azul sobre el vacío; la interfaz se retira y deja el protagonismo a la Tierra y a los satélites.
---

# Design System: OrbitWatch

## Overview

**Creative North Star: "El observatorio silencioso"**

Una herramienta de observación: espacio negro, la Tierra como único objeto grande y los satélites como luz. La interfaz es mínima y no compite con el globo. La densidad se resuelve con color, atenuación y filtros, no con más elementos.

**Key Characteristics:**
- Fondo negro (`#000000`) sin degradados, con un campo de estrellas tenues y poco saturadas.
- La Tierra es el único volumen; todo lo demás es punto, línea o texto pequeño.
- Rendimiento antes que efectos: nada decorativo que cueste frames.

## Colors

- **Espacio** (#000000): fondo de toda la pantalla, con estrellas blancas apenas azuladas o anaranjadas, siempre más tenues que los datos.
- **Rejilla** (blanco al 18 % de opacidad): paralelos y meridianos cada 15°, solo para percibir giro y volumen.
- **Ámbar, el objeto elegido** (#ffc857): solo para el satélite seleccionado, su nombre sobre el globo, su órbita (continua lo recorrido, discontinua lo que falta) y su marca en las reglas de la ficha. Es la única luz intensa: quien mira sabe que lo ámbar es «este». También hace de aviso de datos algo antiguos (texto, nunca solo color).
- **Categorías** (puntos del globo y marcas de la leyenda): estaciones y naves blanco cálido (#e9e4d4), meteorología menta (#7fe0b4), Starlink azul acero (#8fa3bf) al 60 % de opacidad, porque son miles y no deben tapar a los demás. Provisional hasta definir los colores por régimen orbital.
- **Acento, azul de la Tierra aclarado** (#6aa6e8): foco de teclado, estado del reloj, botón principal y elemento activo de la lista de resultados. Rojo (#ff7b72) solo para datos poco fiables o errores.
- **Panel** (#0b0f14, campo de búsqueda #05080b, texto #ece8dd y #a3a7ad, trazos y bordes de controles #6b7280, separadores #2a3038): contrastes calculados con la fórmula WCAG 2 (texto de 7,5:1 a 15,7:1; borde del buscador 4,15:1).

**La regla del ámbar.** Si algo es ámbar, es lo que has elegido; nada más lo es.

## Typography

Dos voces con razón. **Source Serif 4** (variable, solo para nombres: de satélite en listas y etiquetas, y el nombre del producto) por el aire de rótulo de atlas astronómico. **IBM Plex Sans** (400 y 600) para todo lo demás, por su herencia técnica y sus cifras tabulares, que evitan que los datos bailen al cambiar; no es de las tipografías por defecto de las interfaces generadas. Escala fija en rem para una interfaz de herramienta: 0,75 / 0,8125 / 0,9375 / 1,0625 / 1,5 / 1,75. Las cifras de datos siempre llevan `font-variant-numeric: tabular-nums`.

## Layout

El globo ocupa toda la ventana y queda centrado. Sobre él, tres superficies, ninguna con el aspecto de una columna fija:

- **Arriba a la izquierda**, directamente sobre el espacio: el nombre «OrbitWatch» con una línea viva («11 250 objetos · datos de hace 1 h 39 min», que pasa a aviso si envejecen), el buscador y la leyenda de categorías. En ventanas de menos de 72 rem la columna lleva fondo propio porque se solapa con el globo.
- **Leyenda:** cada categoría con color, recuento y un interruptor que la muestra u oculta en el globo (oculta = punto hueco). Todas se despliegan en una lista de hasta 7 filas visibles, con ventana virtual (Starlink son 11 156); al elegir un satélite por otra vía, la lista abierta se lleva a su fila.
- **Buscador:** «/» lo enfoca; escribir abre un desplegable de hasta 8 resultados (flechas, Enter, Esc); mientras hay texto el globo atenúa lo que no coincide y agranda lo que sí (si son 500 o menos).
- **Arriba a la derecha**, solo con algo seleccionado: la ficha. Tipo y órbita («Estación o nave · órbita baja»), dónde está («Sobre 22,6° S, 158,1° E»), altitud y velocidad en cifras grandes, una **regla de altitud** de 0 a 40 000 km con marcas en la ISS, el GPS y la órbita geoestacionaria, la vuelta con su propia regla graduada (cuartos marcados y lo recorrido en ámbar), perigeo, apogeo e inclinación, una frase de fiabilidad («Fiable: elementos de hace 3 h») con el detalle plegado, los identificadores al final y un único botón relleno, «Centrar en pantalla». Se cierra con la cruz o `Esc`.
- **Abajo, centrado**, el reloj: hora local grande, UTC y estado a la izquierda; retroceder, pausa, avanzar y «Ahora» a la derecha.
- **Sobre el globo:** el nombre del seleccionado junto a su punto (a su izquierda si está cerca del borde derecho) y el nombre de lo que haya bajo el puntero.

Al elegir un satélite la cámara vuela hasta él en 0,7 s (sin animación con «reducir movimiento») y se aleja lo necesario para ver su órbita entera: una geoestacionaria exige unas 17 unidades de distancia. La cámara se coloca de modo que el elegido quede en la mitad superior, libre de la ficha y del reloj. Solo escritorio: en pantallas estrechas aún no se adapta.

## Elevation & Depth

Plano. La profundidad la dan la iluminación de la esfera (la luz del Sol real, con su zona oscura) y la atmósfera: un velo azul claro sobre el borde del lado iluminado, como en Google Earth. Sin sombras de interfaz.

## Shapes

Esfera perfecta como forma dominante. Líneas finas (1 px) para la rejilla, las órbitas y las reglas graduadas, que son el motivo propio del diseño: la altitud y la vuelta comparten el mismo trazo de instrumento con marcas. Radio de 4 px en superficies y controles, sin cápsulas.

## Do's and Don'ts

### Do:
- **Do** mostrar siempre la edad de los datos y avisar cuando estén desactualizados.
- **Do** atenuar y submuestrear en zonas densas antes que añadir ruido visual.
- **Do** rotular como visualización cualquier escala no real (por ejemplo, altitud exagerada).

### Don't:
- **Don't** añadir efectos que bajen los fotogramas sin medir su coste.
- **Don't** presentar el cribado como predicción real de colisiones.
- **Don't** usar texturas de Solar System Scope sin atribución visible (CC BY 4.0).
