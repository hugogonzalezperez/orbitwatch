---
name: OrbitWatch
description: Un globo azul sobre el vacío; la interfaz se retira y deja el protagonismo a la Tierra y a los satélites.
---

# Design System: OrbitWatch

## Overview

**Creative North Star: "El observatorio silencioso"**

Una herramienta de observación: espacio negro, la Tierra como único objeto grande y los satélites como luz. La interfaz es mínima y no compite con el globo. La densidad se resuelve con color, atenuación y filtros, no con más elementos.

**Key Characteristics:**
- Fondo negro liso (`#000000`), sin degradados.
- La Tierra es el único volumen; todo lo demás es punto, línea o texto pequeño.
- Rendimiento antes que efectos: nada decorativo que cueste frames.

## Colors

- **Espacio** (#000000): fondo de toda la pantalla.
- **Tierra, azul mate** (#1d4e89): color provisional de la esfera hasta que haya texturas.
- **Rejilla** (blanco al 18 % de opacidad): paralelos y meridianos cada 15°, solo para percibir giro y volumen.
- **Datos, ámbar** (#ffc857): el color de los satélites, la única luz intensa. También el aviso de elementos algo antiguos.
- **Acento, azul de la Tierra aclarado** (#6aa6e8): foco de teclado y estado del reloj. Rojo (#ff7b72) solo para datos poco fiables o errores.
- **Panel** (#0b0f14, texto #e8e8e8 y #a3a7ad, borde de controles #6b7280): contrastes comprobados con la fórmula WCAG 2 (texto ≥ 7,5:1, bordes ≈ 4:1).
- Colores por régimen orbital (LEO, MEO, GEO, elíptica) y estados de frescura (normal, aviso, desactualizado): `[to be resolved during implementation]`.

**The Dark Stage Rule.** El fondo es siempre negro y la única fuente de color intenso son los datos.

## Typography

Sans-serif del sistema para texto de interfaz; cifras tabulares en la hora y las posiciones para que no bailen al cambiar. Familia, escala y jerarquía: `[to be resolved during implementation]`.

## Layout

El globo ocupa toda la ventana y queda centrado; sin desplazamiento lateral (pan). El panel de reloj y de la ISS flota abajo, centrado, en dos columnas en pantallas anchas y apilado en estrechas; los paneles futuros irán por los bordes. Todavía no se puede ocultar. Móvil y escritorio comparten el mismo lienzo.

## Elevation & Depth

Plano. La profundidad la dan la iluminación de la esfera (luz direccional con zona oscura) y, más adelante, la atmósfera. Sin sombras de interfaz.

## Shapes

Esfera perfecta como forma dominante. Líneas finas (1 px) para la rejilla y las órbitas.

## Do's and Don'ts

### Do:
- **Do** mostrar siempre la edad de los datos y avisar cuando estén desactualizados.
- **Do** atenuar y submuestrear en zonas densas antes que añadir ruido visual.
- **Do** rotular como visualización cualquier escala no real (por ejemplo, altitud exagerada).

### Don't:
- **Don't** añadir efectos que bajen los fotogramas sin medir su coste.
- **Don't** presentar el cribado como predicción real de colisiones.
- **Don't** usar texturas de Solar System Scope sin atribución visible (CC BY 4.0).
