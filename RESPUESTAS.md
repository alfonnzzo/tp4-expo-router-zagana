# Respuestas del TP4 Biblioteca IPF

Alumno: Alfonso Zagaña Torancio.

Las citas usan el formato archivo:línea y se tomaron del código de este repositorio. Donde una prueba solo se puede hacer en un teléfono, el texto lo indica con la frase "No verificado en dispositivo:".

## Parte B

### B1. El ciclo de vida de useLibros

a) Render por render

Primero aclaro dónde corre el hook. `useLibros()` no corre dentro del Catálogo. Lo ejecuta `ProveedorCatalogo` en el layout raíz (src/context/CatalogoContext.tsx:16 y src/app/_layout.tsx:14). El Catálogo solo lee el resultado con `useCatalogo()` (src/app/(tabs)/(catalogo)/index.tsx:13). El proveedor y el Catálogo se montan en el mismo primer render de la app.

`cargando`, `libros` y `error` no son estados. Se calculan en cada render a partir de dos estados, `intento` y `respuesta` (src/hooks/useLibros.ts:15-16 y 40-42):

```ts
const cargando = respuesta === null || respuesta.intento !== intento;
const libros = cargando || respuesta.huboError ? [] : respuesta.libros;
const error = !cargando && respuesta.huboError ? MENSAJE_ERROR : null;
```

Como el efecto no llama a ningún setState antes de que llegue la respuesta, no hay un render extra para poner `cargando` en true.

Camino sin error (80 % de las veces, src/lib/api.ts:9):

| Render | Qué lo provoca | intento | respuesta | cargando | libros | error |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Montaje de la app | 0 | null | true | [] | null |
| 2 | `setRespuesta` cuando `obtenerLibros()` resuelve, a los 800 ms (src/lib/api.ts:8, src/hooks/useLibros.ts:23) | 0 | intento 0, 16 libros, huboError false | false | los 16 libros | null |

Después del render 1 se ejecuta el efecto (src/hooks/useLibros.ts:18-34). Crea `vigente = true` y llama a `obtenerLibros()`. Después del render 2 el efecto no vuelve a correr, porque `intento` sigue valiendo 0.

Camino con error y reintento:

| Render | Qué lo provoca | intento | respuesta | cargando | libros | error |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Montaje de la app | 0 | null | true | [] | null |
| 2 | `setRespuesta` desde el `catch` (src/hooks/useLibros.ts:28) | 0 | intento 0, libros vacíos, huboError true | false | [] | "No pudimos cargar el catálogo..." |
| 3 | La persona toca "Reintentar" y se ejecuta `setIntento` (src/hooks/useLibros.ts:37) | 1 | la misma de antes, con intento 0 | true | [] | null |
| 4a | `obtenerLibros()` resuelve en el segundo intento | 1 | intento 1, 16 libros, huboError false | false | los 16 libros | null |
| 4b | `obtenerLibros()` vuelve a fallar | 1 | intento 1, libros vacíos, huboError true | false | [] | "No pudimos cargar el catálogo..." |

En el render 3 `respuesta.intento` vale 0 y `intento` vale 1. Por eso `cargando` vuelve a ser true sin que yo tenga que escribir `setCargando(true)`.

El Catálogo se vuelve a renderizar en cada uno de esos renders. El objeto que devuelve `useLibros()` es nuevo cada vez, y ese objeto es el `value` del contexto (src/context/CatalogoContext.tsx:17). En pantalla se ve el indicador (src/app/(tabs)/(catalogo)/index.tsx:17-18), la lista o el mensaje con "Reintentar" (index.tsx:19-20).

Cuento solo los renders que provoca el hook. Los renders por otras causas, como la navegación, no están en la tabla.

b) Desmontaje del Catálogo y limpieza

Por el código, el Catálogo no se desmonta en ninguna de las dos situaciones.

- Cambiar a "Mis reservas". Las pestañas vienen de `expo-router/js-tabs` (src/app/(tabs)/_layout.tsx:1). Cada pantalla se renderiza la primera vez que se visita y después sigue montada (`lazy` vale true por defecto, node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts:209). La pestaña inactiva solo se oculta. La opción `popToTopOnBlur` vale false por defecto (types.d.ts:223), así que la pila de la pestaña tampoco se reinicia.
- Abrir un detalle. `FilaLibro` hace `router.push` dentro del Stack de la pestaña (src/components/FilaLibro.tsx:14). El `index` queda debajo del detalle y sigue montado.

Además, la limpieza que escribí no está en el Catálogo. Está en el efecto de `useLibros`, que vive en el proveedor del layout raíz (src/hooks/useLibros.ts:31-33). Ese proveedor no se desmonta mientras la app está abierta. Entonces ninguna navegación entre pantallas ejecuta mi limpieza.

La limpieza se ejecuta en estas situaciones reales:

- Cuando cambia `intento`. React ejecuta la limpieza del efecto anterior justo antes de ejecutar el nuevo. En esta app ese pedido anterior ya terminó, porque el botón "Reintentar" solo se muestra cuando `cargando` es false. Entonces poner `vigente = false` no descarta nada.
- Cuando el proveedor se desmonta. Pasa al cerrar la app y, en desarrollo, cuando una recarga rápida vuelve a montar el layout raíz. Si el pedido seguía en curso, la limpieza evita llamar a `setRespuesta` sobre un componente que ya no existe.
- Expo Router no usa StrictMode (no aparece en node_modules/expo-router/build). Por eso el efecto no corre dos veces al montar.

Conclusión: en esta app la limpieza casi nunca descarta una respuesta real. La dejé porque el enunciado la pide y porque protege el hook si más adelante se usa en una pantalla que sí se desmonta, como el detalle.

No verificado en dispositivo: no pude correr la app en un teléfono con un `console.log` temporal. Para comprobarlo haría esto:

1. Agregar `console.log('limpieza useLibros', intento)` dentro de la función de limpieza de src/hooks/useLibros.ts:31-33.
2. Agregar en src/app/(tabs)/(catalogo)/index.tsx un `useEffect(() => () => console.log('Catalogo desmontado'), [])`.
3. Abrir la app con la consola de Metro a la vista.
4. Tocar la pestaña "Mis reservas" y volver al Catálogo. Después abrir un libro y volver. Resultado esperado: ninguno de los dos mensajes aparece.
5. Esperar un error de carga (pasa 1 de cada 5 veces) y tocar "Reintentar". Resultado esperado: aparece `limpieza useLibros 0` y ningún mensaje de desmontaje.
6. Sacar los dos `console.log`, porque el enunciado no los permite en la entrega (A4).

c) Por qué el efecto no puede ser async

`useEffect` espera que la función devuelva nada o una función de limpieza. Una función `async` siempre devuelve una promesa. React recibiría la promesa como si fuera la limpieza. En desarrollo avisa del error, TypeScript lo rechaza y la limpieza nunca se ejecuta.

Lo resolví con un efecto normal que usa `.then` y `.catch` sobre la promesa. Así el efecto devuelve la limpieza en el nivel donde React la espera (src/hooks/useLibros.ts:18-34):

```ts
useEffect(() => {
  let vigente = true;
  obtenerLibros()
    .then((libros) => {
      if (vigente) {
        setRespuesta({ intento, libros, huboError: false });
      }
    })
    .catch(() => {
      if (vigente) {
        setRespuesta({ intento, libros: [], huboError: true });
      }
    });
  return () => {
    vigente = false;
  };
}, [intento]);
```

La otra forma válida es declarar una función `async` dentro del efecto y llamarla. Elegí la cadena de promesas porque no necesita una función extra.

d) Cómo funciona reintentar

`reintentar` suma 1 al estado `intento` (src/hooks/useLibros.ts:36-38):

```ts
function reintentar() {
  setIntento((actual) => actual + 1);
}
```

`intento` está en el array de dependencias del efecto (src/hooks/useLibros.ts:34). Cuando cambia, React ejecuta la limpieza anterior y vuelve a ejecutar el efecto. El efecto llama otra vez a `obtenerLibros()`.

Usé `intento` y no otro valor por estas razones:

- El efecto no lee nada más. `obtenerLibros()` no recibe parámetros. Entonces el único motivo para repetirlo es "la persona pidió otro intento".
- Es un contador y no un booleano. Un contador cambia en cada toque, aunque el intento anterior también haya fallado. Un booleano que pasa de true a false no cambia dos veces seguidas.
- También sirve para marcar la respuesta. Cada respuesta guarda el `intento` que la pidió. Con eso `cargando` se calcula como `respuesta.intento !== intento` (línea 40).
- No puedo poner `libros`, `error` ni `cargando` como dependencias. Son el resultado del efecto. El efecto cambiaría su propia dependencia y se repetiría sin parar.

### B2. La condición de carrera del buscador

El escenario es el del enunciado. En t = 0 ms escribe "bor" y se pide `buscarLibros("bor")`, que tarda 1.400 ms. En t = 200 ms escribe "borges" y se pide `buscarLibros("borges")`, que tarda 300 ms. La respuesta de "borges" llega en t = 500 ms y la de "bor" en t = 1.400 ms.

Mi código es src/hooks/useBusqueda.ts:20-39. La versión "sin limpieza" es la misma, sin `vigente`. En la columna "sin limpieza" uso la versión simple, que guarda solo la lista:

```ts
useEffect(() => {
  buscarLibros(consulta).then((datos) => {
    setResultados(datos);
  });
}, [consulta]);
```

| Momento | Qué pasa | Sin limpieza: qué se ve | Con tu código: qué se ve |
| --- | --- | --- | --- |
| t = 0 ms | Escribe "bor". Se pide `buscarLibros("bor")`, que tarda 1.400 ms. | La lista vacía. Todavía no hay respuesta. | "Buscando...". `consulta` vale "bor" y `respuesta` es null, entonces `cargando` es true (src/hooks/useBusqueda.ts:45-47). El efecto crea su `vigente` y la deja en true. |
| t = 200 ms | Escribe "borges". Se pide `buscarLibros("borges")`, que tarda 300 ms. | La lista vacía. Hay dos pedidos en vuelo. | "Buscando...". Antes de ejecutar el efecto nuevo, React ejecuta la limpieza del anterior y pone en false el `vigente` del pedido de "bor". |
| t = 500 ms | Llega la respuesta de "borges". | La lista de "borges": El Aleph y Ficciones. | La lista de "borges": El Aleph y Ficciones. `vigente` de este pedido es true, entonces se guarda con `setRespuesta`. |
| t = 1.400 ms | Llega la respuesta de "bor". | `setResultados` pisa la lista con la respuesta de "bor". El campo dice "borges" y la lista es la de "bor". | No cambia nada. El `vigente` de este pedido es false (línea 27), entonces no se llama a `setRespuesta` y no hay render. Sigue la lista de "borges". |

Aclaración sobre los datos de esta app. "bor" y "borges" devuelven los mismos dos libros (El Aleph y Ficciones, src/data/libros.ts:7-8). Con esas dos palabras el error de la columna del medio no se ve a simple vista. Se ve con "sab" y "sabato". "sab" devuelve tres libros, porque también coincide con Isabel Allende, y "sabato" devuelve dos. No lo probé en pantalla. Lo comprobé aplicando el mismo filtro de `buscarLibros` a los datos.

a) Qué hace la limpieza y cuándo se ejecuta

La limpieza es `return () => { vigente = false; }` (src/hooks/useBusqueda.ts:36-38). Cada vez que se ejecuta el efecto se crea una variable `vigente` nueva. El `.then` de ese pedido solo ve su propia variable. Cuando la limpieza pone `vigente` en false, ese `.then` descarta la respuesta cuando llegue.

Se ejecuta en dos momentos:

- Justo antes de que se ejecute el efecto siguiente, cuando cambia `consulta` o `intento` (array de dependencias, línea 39).
- Cuando la pantalla /buscar se desmonta, por ejemplo al tocar atrás.

Si la persona borra todo el texto, `consulta` pasa a ser "". El efecto sale temprano (líneas 21-23), pero React igual ejecuta antes la limpieza del pedido anterior. Entonces una respuesta vieja tampoco aparece después de borrar.

La limpieza no cancela el pedido. `buscarLibros` sigue esperando y resuelve igual. Lo que hace es ignorar el resultado.

Hay una segunda defensa. Cada respuesta guarda la `consulta` que la pidió. `respondida` compara esa consulta con la actual (líneas 45-46). Sirve para no mostrar datos de otra búsqueda en el render en que cambia la consulta. No reemplaza a `vigente`. Si una respuesta vieja llegara a guardarse, pisaría a la nueva, `respondida` daría false y la pantalla quedaría en "Buscando..." sin salida.

b) La propuesta de comparar `texto === q` dentro del `.then`

No funciona. La función del `.then` es una clausura. Recuerda las variables del render en el que se creó el efecto. En el pedido de "bor", el valor de `q` que ve esa función es "bor", aunque la persona ya haya escrito "borges". Cuando llega la respuesta, la comparación es `"bor" === "bor"`. Da true siempre y la respuesta vieja se guarda igual.

La clausura no ve el valor actual de la URL. Ve el valor que tenía cuando se creó. Para que la comparación funcionara habría que leer el valor más reciente desde un `useRef` que se actualice en cada render. Eso agrega otro mecanismo para lograr lo mismo que ya logra la limpieza.

Mi solución usa la clausura a favor. La variable `vigente` es una variable común que la clausura del `.then` comparte con la función de limpieza de ese mismo efecto. Cuando la limpieza la modifica, el `.then` ve el cambio.

c) La URL, el botón atrás y `router.push`

Mientras la persona escribe, cada letra llama a `router.setParams({ q: nuevo })` (src/app/buscar.tsx:33). Eso cambia los parámetros de la pantalla actual y no apila otra pantalla. La URL muestra el texto, por ejemplo /buscar?q=borges, y el campo lee su valor de la URL (buscar.tsx:32). Un solo toque en atrás sale de /buscar, sin importar cuántas letras se escribieron.

Con `router.push` pasaría esto:

- Cada letra apilaría otra copia de /buscar. Escribir "borges" dejaría seis pantallas en la pila.
- El botón atrás borraría una letra por toque en lugar de salir de la búsqueda.
- Cada pantalla apilada seguiría montada con su propio `useBusqueda` y su propio pedido en curso.
- El campo de texto sería uno nuevo en cada pantalla. Creo que se perdería el foco y el teclado, pero no lo probé.

No verificado en dispositivo: no comprobé cuántas entradas agrega `setParams` al historial del navegador en web. Se vería escribiendo en /buscar en web y tocando atrás en el navegador.

### B3. Mutar o reemplazar

a) Qué muestra el texto

Muestra "Personas en espera: 0" después de los tres toques. `espera.encolar('Ana')` modifica el array interno `#items` de la misma instancia. `useState` sigue guardando esa instancia, con la misma referencia. La función `anotarme` nunca llama a un `setState`. React no sabe que algo cambió, entonces no vuelve a renderizar y el texto no se recalcula. La cola tiene tres personas, pero la pantalla sigue mostrando el valor del último render.

b) Por qué el número salta a 3

Al escribir en el `TextInput` controlado, cada letra llama al `setState` del texto. Ese `setState` sí provoca un render del componente. En ese render se vuelve a evaluar `espera.tamanio`, que ahora lee 3. El número "salta" por un render que no tiene relación con la cola.

Un error que aparece "a veces" es peor que uno que aparece siempre por estas razones:

- Un error constante se ve en la primera prueba y se corrige. Uno intermitente puede pasar las pruebas manuales si por casualidad hubo otro render.
- La causa y el síntoma están lejos. La causa es la falta de un `setState`. El síntoma aparece al escribir en un campo que no tiene nada que ver.
- Cuando el valor se ve bien, parece que el código funciona. La falla aparece después, con otro orden de acciones, y cuesta reproducirla.

Aclaración: este análisis es el de React sin compilador. La app tiene `"reactCompiler": true` (app.json:56). No probé este fragmento con el compilador activo.

c) Cómo lo resolví en el Context y alternativas

Mi solución está en src/context/BibliotecaContext.tsx. Tengo dos cosas separadas:

- La instancia mutable, para operar. Las colas están en un `Map` dentro de un `useState` con inicializador (línea 66). La pila de vistos está en otro (línea 67).
- Una copia en estado normal, para que React vea el cambio. `esperas` es un objeto con un array por ISBN (línea 76). `recientes` es un array (línea 74).

Después de cada mutación copio el contenido de la instancia a un array nuevo. `aArray()` devuelve siempre un array nuevo (src/estructuras/Cola.ts:37-39 y src/estructuras/Pila.ts:27-29). Ese array nuevo es lo que cambia la referencia.

```ts
cola.encolar({ id: 'propia-' + libro.isbn, nombre: NOMBRE_PROPIO, esMia: true });
colas.set(libro.isbn, cola);
setEsperas(copiarEsperas(colas));
```

Esas líneas están en `reservar` (líneas 127-129). Pasa lo mismo en `entregarSiguiente` (línea 200) y en `registrarVisto` (líneas 96-97). Las mutaciones están dentro de la función del evento, no dentro de la función de actualización de `setState`. Una función de actualización tiene que ser pura y React puede ejecutarla más de una vez. Si encolara ahí, podría encolar dos veces.

| Alternativa | Ventaja | Costo |
| --- | --- | --- |
| Mi solución: instancia más copia en array | Conservo la clase `Cola` con `#items` privado y `desencolar` sin `shift()`. Las pantallas reciben arrays nuevos, que funcionan con `useMemo`, `useCallback` y componentes memorizados. | El mismo dato vive en dos lugares. Si me olvido de llamar a `setEsperas(copiarEsperas(colas))` después de una mutación, vuelve el error de B3. Cada cambio copia la cola completa, que acá tiene pocas personas. |
| Crear una cola nueva a partir de la anterior | El estado es la cola y no hay un segundo dato. Cada cambio produce una instancia nueva, entonces nunca hay mutación visible. | La clase `Cola` actual no tiene un constructor desde un array. Habría que agregarlo. Copiar toda la cola en cada `encolar` hace que la operación cueste proporcional al tamaño y pierde la gracia de la cola. |
| Contador de versión | Es lo más corto: `espera.encolar('Ana'); setVersion((v) => v + 1)`. No copia nada. | La referencia de la cola nunca cambia. Cualquier `useMemo`, `useEffect` o componente memorizado que dependa de la cola no se entera. Si me olvido de sumar al contador, falla igual que en B3. |
| `useReducer` | Toda la lógica queda en un lugar, con acciones con nombre, y es fácil de probar. | El reducer tiene que ser puro y puede ejecutarse dos veces. No puedo mutar una instancia de `Cola` adentro. Tendría que copiar la cola en cada acción, que es la alternativa anterior con más código. |

### B4. ¿Dónde vive cada dato?

| Dato | Dónde vive en tu app | Por qué ahí y no en otro lugar |
| --- | --- | --- |
| Texto del buscador | URL, parámetro `q` (src/app/buscar.tsx:15-16 y 33) | La consigna lo pide y además permite abrir `bibliotecaipf://buscar?q=borges`. Hay una sola fuente: el campo lee `texto` de la URL (línea 32). Con `useState` habría dos copias que podrían diferir. No va al Context porque solo lo usa esta pantalla. |
| Préstamos y reservas | Context. Los préstamos son el estado `prestamos` (src/context/BibliotecaContext.tsx:75). Las reservas en espera no se guardan aparte: se calculan con `obtenerReservasEnEspera` (src/lib/reservas.ts:21-38 y src/app/(tabs)/reservas.tsx:60). | Los leen el detalle, la confirmación y "Mis reservas", que están en navegadores distintos. Un estado local se perdería al cerrar un modal. No va a la URL porque no es una dirección que se comparta. |
| Listas de espera | Context. `Map` de instancias de `Cola` (línea 66) más la copia `esperas` (línea 76). | Las usan el detalle, la confirmación, "Mis reservas" y el mostrador. La instancia de `Cola` mantiene el orden de llegada. La copia es lo que ven las pantallas. |
| Vistos recientemente | Context. `Pila` (línea 67) más la copia `recientes` (línea 74). | El detalle escribe con `registrarVisto` y el Catálogo lee. Son pantallas distintas y el detalle se desmonta al volver. Tiene que sobrevivir a eso. |
| Sesión del personal | Context, `sesionIniciada` (línea 73) | La necesita el layout raíz para `Stack.Protected` (src/components/NavegacionRaiz.tsx:22-27). Esa decisión no puede depender del estado de una pantalla. También la lee el link "Personal" (src/components/EnlacePersonal.tsx:12). No se guarda en disco, entonces se pierde al cerrar la app. |
| Ejemplares disponibles de un libro | Se calcula, con `calcularDisponibles(libro, prestamos)` (src/lib/reservas.ts:8-11) | Es `libro.ejemplares` menos los préstamos de ese ISBN. Si lo guardara, habría dos datos que mantener iguales. Lo uso en el detalle (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:75), en la confirmación (src/app/reservar/[isbn].tsx:69) y en `reservar` (línea 116). |
| Estado del permiso de cámara | Sistema operativo. La app guarda solo un reflejo en un almacén de módulo (src/hooks/usePermiso.ts:7-10), que se lee con `useSyncExternalStore` (líneas 30-34). | La persona puede cambiar el permiso en Ajustes sin que la app se entere. El dato verdadero es el del sistema. Por eso lo vuelvo a consultar al montar y al volver a primer plano. El reflejo permite que la pantalla del escáner y la pantalla previa vean el mismo valor sin pasar por el Context. |
| Identificador de la notificación programada | Context, dentro de cada préstamo, campo `recordatorioId` (src/types/index.ts:23 y src/context/BibliotecaContext.tsx:164-168). La notificación misma vive en el sistema operativo. | Hay un identificador por préstamo. Lo necesito en `devolver` y en `desactivarRecordatorio` para cancelarla (líneas 142-144 y 192). Como no usé AsyncStorage, se pierde si se cierra la app. |

Cuando cambia el `value` del Context, se vuelven a renderizar todos los componentes que llaman a `useBiblioteca()`. React no mira qué campo usa cada uno. Los que están montados en la app son:

- `NavegacionRaiz` (src/components/NavegacionRaiz.tsx:8).
- `EnlacePersonal`, en el header del Catálogo (src/components/EnlacePersonal.tsx:9).
- El Catálogo (src/app/(tabs)/(catalogo)/index.tsx:14).
- "Mis reservas" (src/app/(tabs)/reservas.tsx:54).
- El detalle, si hay uno en la pila (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:23).

Los otros consumidores, `login`, `mostrador` y la confirmación, solo se renderizan mientras están abiertos.

Sí, el Catálogo se vuelve a renderizar al activar un recordatorio en otra pestaña, aunque solo use `recientes`. Hay dos razones:

- Las pestañas siguen montadas (explicado en B1b). El Catálogo no está desmontado cuando estoy en "Mis reservas".
- Activar el recordatorio cambia el estado `prestamos`. Eso crea un `value` nuevo. Además cambian las funciones que dependen de `prestamos`: `reservar`, `devolver`, `activarRecordatorio` y `desactivarRecordatorio` (líneas 132, 146, 176 y 194).

Sobre `useMemo` y `useCallback` en el Context, voy a ser honesto. El `useMemo` del `value` (líneas 220-251) no evita este re-render. El proveedor solo se renderiza cuando cambia uno de sus propios estados, y en ese caso el `value` cambia de todas formas. Su utilidad real es evitar un `value` nuevo cuando el proveedor se renderiza por otra causa, y en esta app casi no pasa. El layout raíz pasa siempre el mismo `children`. También hay que tener en cuenta que la app tiene el React Compiler activo (app.json:56), que memoriza por su cuenta buena parte del trabajo de los componentes hijos. No medí cuánto.

Para evitarlo se podría:

- Separar el Context en dos, por ejemplo uno para préstamos y esperas y otro para recientes y sesión.
- Usar una biblioteca con selectores, que renderice cada componente solo cuando cambia el campo que lee.

No vale la pena en una app de este tamaño. Hay cinco pantallas, 16 libros y listas cortas. Un render extra del Catálogo cuesta muy poco, y separar el Context agrega más archivos y más lugares donde equivocarse. Lo haría solo si el Profiler de React DevTools mostrara que el render del Catálogo es lento. Para comprobarlo en lugar de suponerlo: abrir el Profiler, activar el recordatorio desde "Mis reservas" y ver si el Catálogo aparece en el registro con su tiempo de render.

## Parte C

### C1. La pila en tu app

Esta tabla la razoné a partir del código y de los hechos que comprobé en el navegador (expo start --web). No la probé en un teléfono. Solo el paso 4 está comprobado en web. Los pasos 5 y 6 dependen del botón atrás de Android y del toque en la pestaña, y están marcados más abajo.

Hay tres niveles de navegación en la app:

- Stack raíz: src/components/NavegacionRaiz.tsx. Tiene `(tabs)`, `buscar`, `escanear`, `reservar/[isbn]` (modal), `permisos/[recurso]` (modal), `login` (modal, solo sin sesión) y `mostrador` (solo con sesión).
- Pestañas: src/app/(tabs)/_layout.tsx. Tiene "Catálogo" y "Mis reservas".
- Stack de la pestaña Catálogo: src/app/(tabs)/(catalogo)/_layout.tsx. Tiene `index` y `libro/[isbn]`.

Escribo cada pila de base a tope.

| # | Acción | Stack raíz | Pestañas | Stack de la pestaña Catálogo |
| --- | --- | --- | --- | --- |
| 1 | Abre la app. | `(tabs)` | Catálogo (activa), Mis reservas (todavía sin renderizar) | `index` |
| 2 | Toca un libro del Catálogo. | `(tabs)` | Catálogo (activa) | `index`, `libro/[isbn]` |
| 3 | Toca "Reservar". | `(tabs)`, `reservar/[isbn]` (modal) | Catálogo (activa, debajo del modal) | `index`, `libro/[isbn]` |
| 4 | Toca "Confirmar". | `(tabs)` | Mis reservas (activa) | `index`, `libro/[isbn]` (no cambia) |
| 5 | Toca atrás (Android). | `(tabs)` | Catálogo (activa) | `index`, `libro/[isbn]` |
| 6 | Toca la pestaña "Catálogo". | `(tabs)` | Catálogo (activa) | `index` |

Cómo llegué a cada fila:

- Paso 2. `FilaLibro` hace `router.push({ pathname: '/libro/[isbn]' ... })` (src/components/FilaLibro.tsx:14). El destino está dentro del Stack de la pestaña.
- Paso 3. El detalle hace `router.push({ pathname: '/reservar/[isbn]', params: { isbn } })` (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:34). Esa ruta es un modal del Stack raíz (NavegacionRaiz.tsx:19). Se apila encima de `(tabs)` y no toca la pila del Catálogo.
- Paso 4. `router.dismissTo('/reservas')` (src/app/reservar/[isbn].tsx:38). Saca el modal y deja visible la pestaña "Mis reservas". Verifiqué en web que la URL queda en /reservas y que el historial no vuelve a la confirmación. La pila del Catálogo no se toca, porque el comando no pasa por ella.
- Paso 5. El Stack raíz solo tiene `(tabs)`, así que atrás lo maneja el navegador de pestañas. Su valor por defecto de `backBehavior` es `firstRoute` (node_modules/expo-router/build/react-navigation/routers/TabRouter.js:240), que vuelve a la primera pestaña, la del Catálogo. La pila de esa pestaña conserva el detalle, porque `popToTopOnBlur` vale false por defecto.
- Paso 6. La pestaña "Catálogo" ya está enfocada. Tocarla emite `tabPress` y el Stack de la pestaña vuelve a su primera pantalla (node_modules/expo-router/build/standard-navigation/subscribePopToTopOnParentTabPress.js:14-21, usado en node_modules/expo-router/build/fork/native-stack/createNativeStackNavigator.js:91).

No verificado en dispositivo: el paso 5 es un razonamiento a partir del código de TabRouter. No probé el botón atrás de Android en un teléfono. Se comprobaría haciendo los seis pasos en Expo Go con un Android y mirando qué pantalla aparece después de atrás.

a) Método del paso 4

Usé `router.dismissTo('/reservas')` (src/app/reservar/[isbn].tsx:38). Esto es lo que pasaría con cada método:

- `dismissTo`. Busca la ruta desde el tope hacia abajo y saca todo lo que está encima. Acá saca el modal de confirmación y deja `(tabs)` mostrando "Mis reservas". No agrega pantallas. Atrás no vuelve a la confirmación. Lo comprobé en web.
- `push`. Agrega siempre una pantalla nueva en el tope (TP 2, C1). El modal de confirmación quedaría debajo. Al tocar atrás la persona volvería a la confirmación del mismo libro. No lo probé en esta pantalla.
- `replace`. Cambia la pantalla del tope por la nueva. La confirmación desaparecería de la pila, pero el destino se pondría en el lugar del modal, dentro del Stack raíz. Creo que podría dejar una segunda copia de `(tabs)` en la pila raíz, igual que el problema que encontré con el guard de sesión (ver C3). No probé `replace` acá.

Elegí `dismissTo` porque el destino ya existe en la pila, dentro de `(tabs)`. La confirmación es un modal temporal. Lo correcto es cerrar el modal y volver a esa pantalla, y no apilar otra.

Hay un caso que cubrí aparte. Si el libro ya estaba reservado, `confirmar` no navega: muestra el mensaje y se queda en el modal (líneas 34-37). Y `cerrarPantalla` (src/lib/navegacion.ts:3-9) usa `router.back()` si hay a dónde volver y `router.replace('/')` si no.

b) Qué ve la persona en el paso 6

Depende de dónde estaba antes de tocar la pestaña.

- Si ya estaba en la pestaña "Catálogo", como en el paso 5 de mi tabla, ve el Catálogo (la lista). Tocar la pestaña activa reinicia su pila.
- Si estaba en "Mis reservas", por ejemplo si en el paso 5 no hubiera tocado atrás y hubiera tocado la pestaña "Catálogo" directamente, ve el detalle del libro. Cada pestaña conserva su propia pila. La pestaña "Catálogo" no se desmontó (B1b) y `popToTopOnBlur` vale false por defecto.

Me parece correcto el comportamiento, por estas razones:

- Cada pestaña recuerda dónde estaba la persona. Es lo que se espera de una app con pestañas.
- Al volver al detalle del libro reservado, se ve el efecto de la reserva. "Ejemplares disponibles" y "Personas en lista de espera" se calculan con el estado actual (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:75-76).
- Volver a tocar la pestaña activa lleva a la lista. Es la forma estándar de salir de una pila.

Si no quisiera conservar la pila, pondría `popToTopOnBlur: true` en la pestaña "Catálogo" (src/app/(tabs)/_layout.tsx:15-22). No lo hice.

### C2. El escáner que dispara de más

a) `router.push` sin protección

Si dentro de `onBarcodeScanned` llamara a `router.push` sin protección, cada ejecución de la función agregaría una navegación. Con el código frente a la cámara, la función se ejecuta muchas veces por segundo.

Esto se relaciona con la cola de acciones del TP 2. Cada llamada a `router.push` no navega en el momento. Agrega una acción al final de una cola (node_modules/expo-router/build/global-state/routingQueueContext.js:75-85). Después `RoutingQueueDrainer` procesa todas las acciones de la cola en orden, una por una (node_modules/expo-router/build/global-state/RoutingQueueDrainer.js). La cola no descarta ni une acciones iguales. `push` no compara con la pantalla del tope.

Resultado: el detalle del mismo libro quedaría apilado varias veces. La persona tendría que tocar atrás una vez por cada copia. La cola solo garantiza el orden. No evita los duplicados. La protección tiene que estar antes de llamar a `router.push`.

b) `useRef` o `useState`

Usé `useRef`. Tengo dos referencias en src/app/escanear.tsx:21-23:

```ts
const yaNavego = useRef(false);
const ultimoCodigo = useRef<string | null>(null);
const previaMostrada = useRef(false);
```

Un `useState` puesto en true en el primer escaneo no alcanza por estas razones:

- `setState` no cambia la variable en el momento. React guarda el valor nuevo y lo muestra en el render siguiente. Hasta que ese render ocurra, la función `alLeer` sigue viendo `false`.
- La cámara puede llamar a `onBarcodeScanned` varias veces antes de que React termine ese render. Todas esas llamadas leen el valor viejo y todas navegan.
- Aunque el render llegue, la función que tiene la cámara es la del render anterior. Esa función recuerda el valor que había cuando se creó.

Con `useRef`, `yaNavego.current = true` cambia el valor al instante. Todas las llamadas siguientes leen `.current` en el momento en que se ejecutan y no un valor recordado. Además, cambiar una referencia no provoca un render que no necesito.

Uso las dos referencias para cosas distintas:

- `yaNavego` frena todo después de navegar (líneas 33-35 y 50).
- `ultimoCodigo` ignora un código igual al anterior (línea 50), para que el mismo código frente a la cámara no se procese una y otra vez.

c) `replace` y no `push`

Usé `router.replace({ pathname: '/libro/[isbn]', params: { isbn: libro.isbn } })` (src/app/escanear.tsx:46). El escáner es un paso intermedio. Con `replace` el detalle ocupa el lugar del escáner y el escáner sale de la pila. Atrás no vuelve a la cámara.

Con `push` el escáner quedaría debajo del detalle y seguiría montado. Al tocar atrás la persona vería la cámara otra vez. En esta app eso es peor que molesto. La referencia `yaNavego` seguiría en true, porque el componente no se desmontó. Entonces `alLeer` y `abrirLibro` saldrían de inmediato (líneas 33-35 y 50). La cámara estaría abierta y no leería nada. Tampoco funcionaría el ISBN a mano, porque también pasa por `abrirLibro`. Sería una pantalla sin salida, que el enunciado prohíbe.

Con `replace` el componente `Escanear` se desmonta. Al abrir el escáner otra vez se crea uno nuevo, con las referencias en sus valores iniciales.

Comprobado en web: el escáner está dentro del Stack raíz y el detalle está dentro del Stack de la pestaña Catálogo, que es otro navegador. Escribí el ISBN 9780307474728 en /escanear y toqué "Abrir libro". La URL pasó a /libro/9780307474728 y se vio el detalle con las pestañas abajo. Al tocar atrás apareció el Catálogo en la URL /, sin flecha de volver y sin pantalla de escáner debajo. No quedó una copia de `(tabs)` de más.

No verificado en dispositivo: el mismo recorrido con la cámara real leyendo un código de barras, y el botón atrás físico de Android. Se comprobaría en Expo Go: escanear un libro, ver el detalle y tocar atrás.

d) ISBN que no está en el catálogo

Si el ISBN no está, `abrirLibro` no navega y llama a `setAviso` con el texto "El libro con ISBN ... no está en el catálogo. Probá con otro código." (src/app/escanear.tsx:40-44). El aviso se muestra con un botón "Seguir escaneando" (líneas 79-84). La cámara sigue abierta.

El mismo aviso no aparece diez veces por dos motivos:

- `ultimoCodigo` guarda el último código leído (líneas 50-53). Mientras el mismo código siga frente a la cámara, `alLeer` lo ignora.
- El aviso es un solo texto en un estado (`useState<string | null>`), no una lista. Aunque se llamara dos veces, habría un solo aviso en pantalla.

Si la persona lee un código distinto, el aviso se reemplaza por el nuevo. "Seguir escaneando" borra el aviso y pone `ultimoCodigo` en null (líneas 57-60). Así el mismo código se puede volver a leer, por ejemplo si lo había escaneado mal.

Hay un caso más. Si el catálogo todavía está cargando o falló, `abrirLibro` no busca el libro. Pone `ultimoCodigo` en null (líneas 36-39) para que ese mismo código se vuelva a procesar cuando el catálogo esté listo.

### C3. Deep links y rutas protegidas

Los deep links se prueban en Expo Go con la URL equivalente `exp://IP:8081/--/ruta`. Por ejemplo, `exp://IP:8081/--/libro/9780307474728`. Esta tabla la completé razonando desde el código y con lo que comprobé en el navegador. En la columna "Qué ve" indico qué está comprobado.

| Link | Qué ve la persona | Qué queda debajo en la pila | Qué parte de tu código lo decide |
| --- | --- | --- | --- |
| `bibliotecaipf://libro/` más un ISBN existente, por ejemplo 9780307474728 | El detalle de "Cien años de soledad", con el título en el header, los ejemplares disponibles, las personas en espera y el botón "Reservar". | El Catálogo (`index`) dentro del Stack de la pestaña. Atrás lleva al Catálogo. | La ruta src/app/(tabs)/(catalogo)/libro/[isbn].tsx y el `anchor: 'index'` de src/app/(tabs)/(catalogo)/_layout.tsx:7-9, más el `anchor: '(tabs)'` de src/app/_layout.tsx:8-10. La pantalla busca el libro en la línea 25. |
| `bibliotecaipf://libro/123` | El detalle con el mensaje "El ISBN no es válido. Tiene que tener 13 números, sin guiones." y el enlace "Ir al Catálogo". | El Catálogo, por el mismo `anchor`. | La pantalla, con `esIsbnValido` (src/lib/isbn.ts:3-5) en src/app/(tabs)/(catalogo)/libro/[isbn].tsx:37-47. |
| `bibliotecaipf://buscar?q=borges` | La pantalla de búsqueda con "borges" en el campo y dos resultados: El Aleph y Ficciones. | Las pestañas, con el Catálogo. Atrás lleva al Catálogo. | `anchor: '(tabs)'` en src/app/_layout.tsx:8-10. La búsqueda la hace src/hooks/useBusqueda.ts con el `q` que lee src/app/buscar.tsx:15-17. |
| `bibliotecaipf://mostrador` (sin sesión) | El Catálogo, en la URL `/`. No aparece el mostrador. | Nada más. El Stack raíz solo tiene `(tabs)`. | `Stack.Protected guard={sesionIniciada}` en src/components/NavegacionRaiz.tsx:25-27. Sin sesión la ruta no está registrada. |
| `bibliotecaipf://reserva` | La pantalla "Mis reservas". La URL cambia a `/reservas`. | Las pestañas. Atrás, desde "Mis reservas", lleva al Catálogo por el `backBehavior` de las pestañas. | `<Redirect href="/reservas" />` en src/app/reserva.tsx:3-5. |
| `bibliotecaipf://escanear` (cámara bloqueada) | El escáner sin cámara. Un mensaje dice "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN." con la ruta de Ajustes, el botón "Abrir Ajustes" y el campo para escribir el ISBN. | Las pestañas, con el Catálogo, por el `anchor` de la raíz. | `ZonaCamara` en src/components/ZonaCamara.tsx:65-74 y el estado que calcula `calcularEstado` (src/lib/permisos.ts:36-44). No se abre /permisos/camara, porque ese `useEffect` solo corre si el estado es `preguntable` (src/app/escanear.tsx:25-30). |

Qué está comprobado:

- Comprobado en web (expo start --web): `/libro/123` llega a la pantalla de detalle con el mensaje de ISBN inválido y el enlace. `/buscar?q=borges` muestra El Aleph y Ficciones y deja las pestañas debajo. `/mostrador` sin sesión muestra el Catálogo en `/`. `/reserva` cambia la URL a `/reservas`.
- Razonado desde el código y sin comprobar: el caso del ISBN existente, la pila que queda debajo en cada fila y todo lo que dice la columna "Qué queda debajo" sobre el botón atrás.

No verificado en dispositivo: ninguno de los seis links se probó en Expo Go con `exp://IP:8081/--/...` ni con el esquema `bibliotecaipf://`. Se comprobaría pegando cada URL en el navegador del teléfono con Expo Go instalado. El esquema `bibliotecaipf://` es el de app.json y solo funciona en una development build o en una app instalada. En Expo Go el enunciado indica usar `exp://`.

No verificado en dispositivo: el link `bibliotecaipf://escanear` con la cámara bloqueada. Para probarlo, primero hay que negar el permiso dos veces en Android (o una vez en iOS) hasta que `canAskAgain` sea false. Después hay que abrir el link y mirar el mensaje y el botón "Abrir Ajustes". El texto que muestra sale del código de `ZonaCamara`, pero el valor real de `canAskAgain` depende del teléfono.

Hallazgo sobre la sesión. En web comprobé que cambiar la sesión solo con el guard, cuando la pantalla enfocada era /login o /mostrador, dejaba la pila raíz con dos copias de `(tabs)`. El Catálogo mostraba una flecha de volver sin sentido. Por eso `login` llama a `router.dismiss()` antes de `iniciarSesion()` (src/app/login.tsx:24-25) y `mostrador` llama a `router.dismissTo('/')` antes de `cerrarSesion()` (src/app/mostrador.tsx:45-46). Después de ese cambio no vi copias duplicadas.

Pregunta final: por qué `/libro/123` llega a la pantalla de detalle

Llega porque el router solo compara la forma de la dirección con los archivos. El archivo `libro/[isbn].tsx` define el patrón `libro/` seguido de un segmento. "123" es un segmento. El router no sabe qué es un ISBN válido ni qué libros existen. Solo entrega el valor como texto en `useLocalSearchParams` (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:20). La pantalla `+not-found` se usa únicamente cuando la dirección no coincide con ningún patrón.

La responsabilidad de responder bien es de la pantalla. El detalle valida en dos pasos:

- Primero revisa el formato con `esIsbnValido` (13 dígitos, línea 37). Si falla, muestra el mensaje del ISBN inválido y el enlace "Ir al Catálogo" (líneas 37-47). Esto se hace antes de esperar al catálogo, para no mostrar "Buscando el libro..." con un dato que ya sé que está mal.
- Después, con el catálogo cargado, busca el libro. Si el ISBN tiene 13 dígitos pero no existe, muestra "No encontramos ningún libro con el ISBN ..." (líneas 66-73).

El valor del parámetro también puede llegar como lista de textos (por ejemplo `/libro/1?isbn=2`). `leerParametro` (src/lib/parametros.ts:1-6) lo convierte en un solo texto antes de validar.

### C4. Foco, montaje y primer plano

a) Qué detecta cada herramienta

- `useEffect` con `[]`. Detecta que el componente se montó. Corre una vez al montar y su limpieza corre al desmontar. No sabe nada del foco ni del primer plano. En esta app "Mis reservas" se monta la primera vez que se visita y queda montada (B1b). Volver a la pestaña no vuelve a ejecutarlo.
- `useFocusEffect`. Detecta que la pantalla pasó a estar enfocada dentro de la navegación. Corre cada vez que la persona vuelve a la pantalla: al volver de otra pestaña o al cerrarse un modal apilado encima. Su limpieza corre cuando pierde el foco. No detecta nada que pase fuera de la navegación.
- `AppState`. Detecta si la app entera está en primer plano o en segundo plano. Avisa cuando la persona sale a otra app o a Ajustes y vuelve. No sabe en qué pantalla está la persona.

b) Salir a Ajustes y volver, o cambiar de pestaña

Sale a Ajustes, habilita las notificaciones y vuelve a la app: se entera `AppState`. La app pasa a segundo plano y vuelve a `active`. El listener de `usePermiso` detecta ese cambio (src/hooks/usePermiso.ts:55-64) y llama a `revisar()`. Eso actualiza el almacén y la pantalla muestra "Las notificaciones están permitidas" (src/app/(tabs)/reservas.tsx:43-46). `useEffect` con `[]` no se entera, porque el componente no se desmontó. `useFocusEffect` tampoco, porque la pantalla no perdió el foco de la navegación. Salir de la app no cambia el foco de las pantallas.

Va a la pestaña Catálogo y vuelve a "Mis reservas": se entera `useFocusEffect`. La pantalla recupera el foco y se ejecuta `revisar()` (src/app/(tabs)/reservas.tsx:71-78). `AppState` no se entera, porque la app siguió en primer plano todo el tiempo. `useEffect` con `[]` tampoco, porque la pantalla seguía montada.

No verificado en dispositivo: no probé el recorrido en un teléfono. En web no hay Ajustes del sistema para notificaciones. Se comprobaría en Expo Go con un Android: negar el permiso, ir a Ajustes, habilitarlo y volver. El mensaje de "Mis reservas" tendría que cambiar sin tocar nada.

c) Cuáles usé y por qué

Usé las tres, con un trabajo distinto cada una:

- Montaje. `usePermiso` ejecuta `revisar()` cuando se monta el hook (src/hooks/usePermiso.ts:51-53). Sirve para tener el estado inicial. Sin eso la pantalla se quedaría en "cargando".
- Primer plano. `usePermiso` escucha `AppState` (líneas 55-64). Reacciona solo cuando la app pasa de segundo plano o inactiva (`background` o `inactive`) a `active`. Sirve para volver de Ajustes.
- Foco. "Mis reservas" usa `useFocusEffect` (src/app/(tabs)/reservas.tsx:71-78). Sirve para el modal /permisos/notificaciones. Cuando ese modal se cierra, la pantalla recupera el foco y vuelve a consultar el permiso. También limpia la referencia `pendiente` si el permiso no quedó concedido (líneas 74-76). Así, si la persona cierra el permiso sin aceptarlo, el recordatorio que había pedido no se activa solo más tarde.

El interruptor "Recordarme" guarda el ISBN en `pendiente` y abre el modal (líneas 89-90). Cuando el permiso pasa a `concedido`, un `useEffect` activa el recordatorio de ese ISBN y limpia `pendiente` (líneas 63-69). El almacén de `usePermiso` es compartido, así que la pantalla de "Mis reservas" recibe el cambio aunque el permiso lo haya pedido la pantalla previa.

Qué estado viejo vería la pantalla si usara una sola:

- Solo `useEffect` con `[]`: la persona habilita las notificaciones en Ajustes y vuelve. El mensaje sigue diciendo "Las notificaciones están bloqueadas...". Esto pasa porque el componente no se vuelve a montar.
- Solo `useFocusEffect`: la persona vuelve de Ajustes y la pantalla de permiso sigue abierta, encima de "Mis reservas". "Mis reservas" no recupera el foco, entonces el mensaje no se actualiza. El recordatorio pendiente tampoco se activa hasta que se cierre esa pantalla.
- Solo `AppState`: la persona cierra el modal de permisos sin aceptar. La referencia `pendiente` conserva el ISBN. Más tarde, si habilita las notificaciones desde Ajustes, el recordatorio se activaría sin que la persona lo hubiera pedido en ese momento.

No verificado en dispositivo: no comprobé en un teléfono si la app pasa por `inactive` o por `background` al abrir Ajustes en cada sistema. El listener de `usePermiso` acepta los dos estados, así que cubre ambos casos.

## Parte D · Permisos en mi app

### D1. Recorrido completo de la cámara

Los valores de status y canAskAgain de Android salen de la lectura del código de expo-modules-core, no de un teléfono. El archivo es node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt.

Lo que dice ese código:

- Antes de pedir el permiso por primera vez, la respuesta es status undetermined y canAskAgain true (líneas 266-276).
- Después de cada "No permitir", el servicio llama a shouldShowRequestPermissionRationale y guarda el resultado como "bloqueado" (líneas 73-84).
- Si Android ya no muestra el motivo, canAskAgain pasa a false. Eso pasa en la segunda negación seguida.
- El tipo de la respuesta está en node_modules/expo-modules-core/build/PermissionsInterface.d.ts:22-41. Tiene status (granted, undetermined o denied), expires, granted y canAskAgain.

No verificado en dispositivo: no tengo un teléfono con Android 14 en esta sesión. Para comprobarlo habría que instalar una development build, instalar la app limpia y repetir los seis pasos. Después se mira el valor que devuelve Camera.getCameraPermissionsAsync() en cada paso con un console.log temporal.

| # | Acción | Qué muestra mi app | status | canAskAgain |
|---|--------|--------------------|--------|-------------|
| 1 | Toca "Escanear" por primera vez | Un instante "Revisando el permiso de la cámara..." (src/components/ZonaCamara.tsx:34-36). Después el estado es preguntable y escanear.tsx abre el modal /permisos/camara (src/app/escanear.tsx:25-30). El modal muestra el título "Cámara", el beneficio y el botón "Continuar". Debajo queda el mensaje "Todavía no diste permiso a la cámara..." con el botón "Permitir la cámara" (ZonaCamara.tsx:77-85) | undetermined | true |
| 2 | "Continuar" y "No permitir" | "Continuar" ejecuta pedir() (src/components/PantallaPrevia.tsx:21-26) y aparece el diálogo del sistema. Tras "No permitir" el modal se cierra con cerrarPantalla. La zona de cámara vuelve a mostrar "Todavía no diste permiso..." con "Permitir la cámara" | denied | true |
| 3 | Toca "Escanear" otra vez | Al abrir el escáner de nuevo, previaMostrada es una referencia nueva (escanear.tsx:23). El estado guardado sigue en preguntable, así que el modal /permisos/camara se abre otra vez con "Continuar" | denied | true |
| 4 | "Continuar" y "No permitir" | El sistema muestra el diálogo por segunda vez. Tras la segunda negación el estado pasa a bloqueado. El modal se cierra y la zona de cámara muestra "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN." con la ruta de Ajustes de Android y el botón "Abrir Ajustes" (ZonaCamara.tsx:65-75) | denied | false |
| 5 | Toca "Escanear" otra vez | No se abre el modal, porque escanear.tsx:26 solo lo abre en estado preguntable. Se ve directamente el mensaje de cámara bloqueada con "Abrir Ajustes". El formulario para escribir el ISBN sigue disponible (escanear.tsx:85) | denied | false |
| 6 | "Abrir Ajustes", habilita la cámara y vuelve | Linking.openSettings() abre Ajustes (src/hooks/usePermiso.ts:47-49). Al volver, AppState pasa a active y el hook vuelve a leer el permiso (usePermiso.ts:55-64). El estado cambia a concedido y aparece CameraView con el texto "Apuntá al código de barras de la contratapa." (ZonaCamara.tsx:38-51) | granted | true |

a) En iOS el resultado cambia en el paso 2.

- iOS pregunta una sola vez. Después de "No permitir", el servicio de permisos calcula canAskAgain como status distinto de denied (node_modules/expo-modules-core/ios/Legacy/Services/Permissions/EXPermissionsService.m:130).
- Con status denied, canAskAgain vale false.
- En el paso 2 mi app ya pasa a bloqueado. El modal se cierra y se ve "La cámara está bloqueada..." con la ruta de iOS "Ajustes > Biblioteca IPF > Cámara > activar." (src/lib/permisos.ts:25).
- En el paso 3 no se abre ningún modal ni diálogo. El paso 4 no existe, porque el sistema no vuelve a preguntar.
- El paso 5 es igual al paso 3.
- El paso 6 es igual que en Android. Al volver de Ajustes, AppState dispara la lectura y aparece la cámara.

No verificado en dispositivo: no tengo un iPhone. Tampoco comprobé si iOS reinicia la app al cambiar el permiso en Ajustes. En ese caso la app arrancaría de cero y leería el permiso ya concedido.

b) La línea que decide está en src/lib/permisos.ts:

```ts
function calcularEstado(respuesta: RespuestaSistema): EstadoPermiso {
  if (respuesta.granted) {
    return 'concedido';
  }
  if (respuesta.canAskAgain) {
    return 'preguntable';
  }
  return 'bloqueado';
}
```

La decisión entre "Continuar" y "Abrir Ajustes" está en la línea 40, `if (respuesta.canAskAgain)`.

- Uso dos campos de la respuesta: granted y canAskAgain. El tipo RespuestaSistema ni siquiera declara status (permisos.ts:7-10).
- Mirar solo status no alcanza, porque los pasos 2 y 4 devuelven el mismo status, denied.
- En el paso 2 todavía puedo pedir el permiso. En el paso 4 ya no puedo.
- Si decidiera solo con status, en el paso 4 mostraría "Continuar". Ese botón llamaría a requestCameraPermissionsAsync, que no abriría ningún diálogo y devolvería denied al instante. La persona tocaría un botón que no hace nada.
- Con canAskAgain, el paso 4 muestra "Abrir Ajustes", que es la única salida real.

c) La parte que se entera es el oyente de AppState dentro de usePermiso (src/hooks/usePermiso.ts:55-64).

```ts
useEffect(() => {
  const suscripcion = AppState.addEventListener('change', (nuevo) => {
    const estabaAfuera = anterior.current === 'background' || anterior.current === 'inactive';
    if (estabaAfuera && nuevo === 'active') {
      revisar();
    }
    anterior.current = nuevo;
  });
  return () => suscripcion.remove();
}, [revisar]);
```

- Cuando la app vuelve de Ajustes pasa de background o inactive a active. Entonces se llama a revisar(), que consulta el permiso y lo guarda en el almacén compartido (usePermiso.ts:7-27).
- Si esa parte no existiera, el escáner seguiría mostrando "La cámara está bloqueada" aunque la persona ya la habilitó.
- El almacén guarda el último valor. Volver de Ajustes no desmonta la pantalla, así que useEffect con revisar (usePermiso.ts:51-53) no se ejecuta de nuevo.
- La persona tendría que salir del escáner y volver a entrar para ver la cámara.

### D2. Notificaciones y consistencia

a) Si no cancelara la notificación, el sistema la entregaría igual.

- El recordatorio queda programado en el sistema. Con MODO_DEMOSTRACION en true llega a los 15 segundos (src/constants/biblioteca.ts:6-7 y src/lib/notificaciones.ts:40-43).
- La persona vería "Recordá devolver Rayuela a la biblioteca." de un libro que ya devolvió. El texto lo arma programarRecordatorio en notificaciones.ts:50-54.
- Para evitarlo, devolver() cancela el recordatorio. El código está en src/context/BibliotecaContext.tsx:135-147:

```ts
setPrestamos((actual) => actual.filter((item) => item.isbn !== isbn));
if (prestamo.recordatorioId !== null) {
  await cancelarRecordatorio(prestamo.recordatorioId);
}
```

- cancelarRecordatorio llama a cancelScheduledNotificationAsync y atrapa cualquier error (notificaciones.ts:63-69). La documentación de expo-notifications dice que esa función se resuelve también si no hay una notificación con ese identificador (node_modules/expo-notifications/build/cancelScheduledNotificationAsync.d.ts:4).
- Hay un caso más. La persona puede devolver el libro mientras el sistema todavía está programando el recordatorio. activarRecordatorio lo cubre. Al terminar de programar, revisa si el préstamo sigue vigente con prestamosActuales. Si ya no está, cancela la notificación que acaba de crear (BibliotecaContext.tsx:158-163).
- Si apagan el interruptor durante la programación, desactivarRecordatorio anota el pedido en cancelarAlTerminar (BibliotecaContext.tsx:179-184).

b) El identificador se guarda dentro del préstamo, en el campo recordatorioId (src/types/index.ts:19-24). Se asigna en BibliotecaContext.tsx:164-168. Los préstamos viven en un useState (BibliotecaContext.tsx:75), es decir, solo en memoria.

Qué pasa si la app se cierra antes de que llegue la notificación:

- La notificación no se pierde. En Android, expo-notifications guarda cada pedido programado en SharedPreferences y lo registra en el AlarmManager (node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt:20, 67 y 111-127).
- Esa librería también vuelve a programar todo después de reiniciar el teléfono. Lo hace en NotificationsService con las acciones BOOT_COMPLETED, REBOOT y MY_PACKAGE_REPLACED (NotificationsService.kt:33-39 y 675-676).
- Por eso el AndroidManifest del módulo declara RECEIVE_BOOT_COMPLETED.
- El identificador sí se pierde. Los préstamos desaparecen al cerrar la app, porque no usé almacenamiento persistente.
- Al abrir la app de nuevo, "Mis préstamos" aparece vacío. La notificación sigue programada y la app ya no tiene su identificador.

El problema que aparece:

- Llega un recordatorio de un préstamo que la app ya no conoce.
- No se puede cancelar desde la app, porque no se sabe qué identificador cancelar.
- Si la persona reserva el mismo libro otra vez y activa el recordatorio, quedan dos notificaciones para el mismo libro.

No verificado en dispositivo: no probé el cierre de la app ni el reinicio. En iOS no leí el código nativo. Lo que sé es que las notificaciones locales programadas quedan en el sistema, y debería comprobarlo en un iPhone.

Cómo lo resolvería, sin implementarlo:

- Guardaría los préstamos con su recordatorioId en almacenamiento persistente, por ejemplo AsyncStorage. No está instalado en este proyecto.
- Al iniciar la app llamaría a getAllScheduledNotificationsAsync (node_modules/expo-notifications/build/getAllScheduledNotificationsAsync.d.ts). Compararía esa lista con los préstamos guardados.
- Cancelaría las notificaciones que no pertenecen a ningún préstamo.
- Borraría el recordatorioId de los préstamos cuyo identificador ya no está en la lista, porque esa notificación ya se entregó.
- Otra opción es elegir yo el identificador. El tipo NotificationRequestInput acepta un campo identifier opcional (node_modules/expo-notifications/build/Notifications.types.d.ts:635-639). Con un valor como "recordatorio-" más el ISBN podría cancelar sin guardar nada.

c) El canal se crea antes de pedir el permiso porque, en Android 13 o superior, el sistema no muestra el diálogo hasta que existe al menos un canal.

- La documentación de Expo lo dice así: "On Android 13, app users must opt-in to receive notifications via a permissions prompt. This prompt will not appear until at least one notification channel is created." Está en https://docs.expo.dev/versions/latest/sdk/notifications/ y la consulté en esta sesión.
- En mi código, solicitarPermiso llama a crearCanalPrestamos() antes de requestPermissionsAsync() (src/lib/permisos.ts:62-63).
- El canal se crea con setNotificationChannelAsync en src/lib/notificaciones.ts:30-38. Solo se crea en Android.
- El módulo nativo pide POST_NOTIFICATIONS solo si el teléfono es Android 13 o superior y la app apunta a SDK 33 o más (NotificationPermissionsModule.kt:38-53).

En Android 12 o inferior cambia lo siguiente:

- No existe permiso en tiempo de ejecución. Las notificaciones están activas por defecto.
- requestPermissionsAsync no abre ningún diálogo. El módulo usa getPermissionsWithPromiseImplClassic. Ahí granted es el resultado de areNotificationsEnabled() y canAskAgain vale lo mismo (NotificationPermissionsModule.kt:150-168).
- Si las notificaciones están activas, mi app pasa directo a concedido y la pantalla previa dice "Este permiso ya está concedido." (PantallaPrevia.tsx:47-49).
- Si la persona las apagó en Ajustes, el estado es bloqueado y se muestra "Abrir Ajustes".
- El canal sigue siendo necesario en Android 8 o superior para publicar cualquier notificación. Por eso programarRecordatorio y notificarLibroListo también llaman a crearCanalPrestamos (notificaciones.ts:49 y 72).

No verificado en dispositivo: no probé el diálogo ni el canal en un teléfono.

d) Si el permiso está denegado y me entregan un libro, me entero por un aviso dentro de la app. Aparece en la sección "Avisos" de "Mis reservas" (src/app/(tabs)/reservas.tsx:33-39).

El código que decide está en src/context/BibliotecaContext.tsx:197-218:

```ts
const entregarSiguiente = useCallback(
  async (libro: Libro): Promise<PersonaEnEspera | undefined> => {
    const persona = colas.get(libro.isbn)?.desencolar();
    setEsperas(copiarEsperas(colas));
    if (persona === undefined || !persona.esMia) {
      return persona;
    }
    const estado = await consultarPermiso('notificaciones');
    if (estado === 'concedido') {
      try {
        await notificarLibroListo(libro.titulo);
        return persona;
      } catch {
        agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
        return persona;
      }
    }
    agregarAviso('Tu reserva de ' + libro.titulo + ' está lista. Pasá a retirarla.');
    return persona;
  },
  [colas, agregarAviso],
);
```

- El código consulta el permiso en ese momento. La línea 204 llama a consultarPermiso('notificaciones'), que pregunta al sistema con getPermissionsAsync (src/lib/permisos.ts:46-55). No usa un valor guardado.
- Importa porque la persona puede cambiar el permiso en Ajustes en cualquier momento sin que la app lo sepa.
- El valor guardado en el almacén de usePermiso solo se actualiza cuando hay una pantalla con ese hook montada y la app vuelve a primer plano o la pantalla recupera el foco.
- El mostrador no usa usePermiso. Si usara el valor guardado, podría ser viejo y yo mandaría una notificación que el sistema descarta, o un aviso innecesario.
- Si la notificación falla, también caigo al aviso dentro de la app (líneas 209-212).
- Esta entrega no convierte la reserva en préstamo. Solo quita a la persona del frente de la cola y avisa.

Limitaciones que veo:

- Los avisos viven en memoria. Se pierden al cerrar la app.
- La pestaña "Mis reservas" no muestra un contador de avisos nuevos. La persona tiene que entrar a mirar.

### D3. Lo que mi app pide y lo que no

No corrí prebuild. No existen las carpetas android ni ios en el proyecto.

Para obtener la lista usé dos fuentes:

- Ejecuté `npx expo config --type introspect --json`. Ese comando evalúa los plugins de app.json en memoria y no escribe archivos. Muestra los permisos que agregan los plugins y la plantilla base.
- Leí los AndroidManifest.xml de node_modules/expo-camera y node_modules/expo-notifications. Esos permisos se suman recién en Gradle, cuando se fusionan los manifiestos. El comando anterior no los muestra.

No verificado en dispositivo: no armé una build. No vi el AndroidManifest final fusionado. Es posible que dependencias de dependencias, por ejemplo firebase-messaging que usa expo-notifications (node_modules/expo-notifications/android/build.gradle:43), agreguen permisos que no figuran acá. Se comprobaría con una development build y el comando `adb shell dumpsys package ar.edu.ipf.biblioteca`, filtrando las líneas de permisos con `findstr permission`.

| Plataforma | Permiso o clave declarada | Función de la app que lo justifica | Quién lo agrega |
|------------|---------------------------|------------------------------------|-----------------|
| Android | android.permission.CAMERA | Escáner de códigos de barras (src/app/escanear.tsx) | Plugin expo-camera (node_modules/expo-camera/plugin/src/withCamera.ts:78-84). También está en el AndroidManifest del módulo |
| Android | android.permission.POST_NOTIFICATIONS | Recordatorio de devolución y aviso de libro listo | AndroidManifest de expo-notifications, línea 3. Se suma al fusionar manifiestos |
| Android | android.permission.RECEIVE_BOOT_COMPLETED | Que los recordatorios programados se vuelvan a programar después de reiniciar el teléfono | AndroidManifest de expo-notifications, línea 2 |
| Android | android.permission.INTERNET | Mi app no hace pedidos de red reales, porque el catálogo sale de src/lib/api.ts. Sirve para que la app se conecte al servidor de desarrollo | Plantilla base de Expo (node_modules/@expo/config-plugins/build/plugins/withAndroidBaseMods.js:57). No la bloqueé |
| Android | android.permission.VIBRATE | Mi código no la usa directamente. Queda por la plantilla base | Plantilla base de Expo (withAndroidBaseMods.js:60). No la bloqueé |
| Android | android.permission.RECORD_AUDIO, bloqueado con tools:node remove | No se usa. La app no graba audio | Yo, con blockedPermissions en app.json:23-28. El plugin de cámara tampoco la agrega, por recordAudioAndroid en false (app.json:49) |
| Android | android.permission.SYSTEM_ALERT_WINDOW, bloqueado | No se usa. La plantilla base la agrega entre los permisos opcionales | Yo, con blockedPermissions en app.json:25 |
| Android | android.permission.READ_EXTERNAL_STORAGE y WRITE_EXTERNAL_STORAGE, bloqueados | No se usan. No leo ni guardo archivos | Yo, con blockedPermissions en app.json:26-27 |
| Android | SCHEDULE_EXACT_ALARM y USE_EXACT_ALARM, no declarados | Los recordatorios no necesitan hora exacta. Sin ese permiso las notificaciones programadas llegan en un horario aproximado (node_modules/expo-notifications/build/NotificationPermissions.d.ts:48-51) | Nadie. Es una decisión mía |
| iOS | NSCameraUsageDescription | Texto que se muestra en el diálogo de la cámara: "Usamos tu cámara para leer el código de barras de la contratapa y abrir el libro en el catálogo." | Plugin expo-camera, con el texto que escribí en app.json:47 |
| iOS | NSMicrophoneUsageDescription, no declarada | La app no usa el micrófono | Nadie. El plugin la omite porque microphonePermission está en false (app.json:48) |
| iOS | Entitlement aps-environment con valor development | Mi app solo usa notificaciones locales. No usa notificaciones remotas | Plugin expo-notifications, por su valor por defecto (node_modules/expo-notifications/plugin/src/withNotificationsIOS.ts:20-25 y 38-43) |
| iOS | Permiso de notificaciones, sin clave en Info.plist | Se pide en tiempo de ejecución con requestPermissionsAsync (src/lib/permisos.ts:63) | No hay clave que declarar |

Observación sobre aps-environment:

- El plugin lo agrega porque enableRemoteNotifications vale true por defecto.
- La documentación del tipo dice que, con false, el plugin no agrega ese entitlement y solo funcionan las notificaciones locales (node_modules/expo-notifications/plugin/src/withNotifications.ts:44-53).
- Como mi app solo usa notificaciones locales, podría configurar `"enableRemoteNotifications": false` en el plugin.
- No lo hice y no lo probé.

a) Mi app no declara RECORD_AUDIO por dos motivos:

- Primero, el plugin de expo-camera agrega CAMERA y también RECORD_AUDIO, salvo que recordAudioAndroid sea false. El valor por defecto es true (withCamera.ts:47 y 78-84).
- Segundo, bloqueo la RECORD_AUDIO con blockedPermissions. Eso agrega la entrada con tools:node remove, que borra el permiso aunque otra librería lo declare (node_modules/@expo/config-plugins/build/android/Permissions.js:106-108 y 128-137).

El fragmento de app.json:

```json
"android": {
  "blockedPermissions": [
    "android.permission.RECORD_AUDIO",
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ]
}
```

```json
[
  "expo-camera",
  {
    "cameraPermission": "Usamos tu cámara para leer el código de barras de la contratapa y abrir el libro en el catálogo.",
    "microphonePermission": false,
    "recordAudioAndroid": false
  }
]
```

El comando de introspección confirmó el resultado. En Android, el plugin agrega solo CAMERA, y las otras cuatro entradas aparecen con tools:node remove. En iOS aparece NSCameraUsageDescription y no aparece NSMicrophoneUsageDescription.

b) Para elegir una foto de portada desde la galería usaría expo-image-picker y su función launchImageLibraryAsync.

Permiso necesario:

- La documentación oficial dice: "No permissions request is necessary for launching the image library." (https://docs.expo.dev/versions/latest/sdk/imagepicker/, consultada en esta sesión).
- La misma página aclara una excepción en iOS para videos con las opciones por defecto. Yo pediría solo fotos.
- No verifiqué qué hace el selector en Android 13 o superior. La documentación que leí no habla de READ_MEDIA_IMAGES.
- El plugin de expo-image-picker tiene la opción photosPermission, que escribe NSPhotoLibraryUsageDescription en iOS. Escribiría un texto claro, con el mismo molde que uso para la cámara.
- La documentación también lista CAMERA, READ_EXTERNAL_STORAGE y WRITE_EXTERNAL_STORAGE entre los permisos que agrega en Android. Mi app ya bloquea READ y WRITE en app.json:26-27. Dejaría el bloqueo y comprobaría que el selector funciona.

Actualización OTA o build nueva:

- Hace falta una build nueva.
- expo-image-picker es un módulo nativo que mi app no incluye. Una actualización OTA solo reemplaza el JavaScript y los assets. No puede agregar código nativo.
- Además, el plugin cambia el Info.plist y el AndroidManifest, y esos archivos solo se regeneran al compilar.
- Esta app no tiene configurado el servicio de actualizaciones, así que no puedo decir cómo se empaquetaría. Mi razonamiento sale de que el módulo es nativo.

c) Las partes que no pude verificar del todo en Expo Go son estas:

- El texto de propósito de la cámara en iOS. Expo Go usa su propio Info.plist y no aplica los plugins de mi app.json. Se vería el texto de Expo Go. Solo se ve el mío en una development build. Lo comprobaría con una build de iOS y mirando el diálogo.
- El canal "prestamos" de Android. En Expo Go se crea bajo el paquete de Expo Go. Ajustes no mostraría "Biblioteca IPF", y la ruta que escribí en src/lib/permisos.ts:23-24 no coincidiría. Lo comprobaría en una build de Android, en Ajustes, Aplicaciones, Biblioteca IPF, Notificaciones.
- La lista final de permisos de Android, incluido el bloqueo de RECORD_AUDIO. Solo existe en una build. Se comprueba con `adb shell dumpsys package ar.edu.ipf.biblioteca`, o con prebuild y leyendo android/app/src/main/AndroidManifest.xml.
- El esquema bibliotecaipf:// de los enlaces profundos. Expo Go abre las rutas con su propio esquema. El esquema propio solo existe en una build.
- Los valores reales de status y canAskAgain en cada paso, el diálogo del sistema y la notificación recibida. No tengo teléfono en esta sesión. Se comprueban en un teléfono, con la app recién instalada.

## Parte E · Buenas prácticas y decisiones de diseño

### E1. Revisión de código

a) Problemas del archivo del compañero. Las líneas son las del enunciado. La clasificación sigue la de mi TP 1: error de ejecución, advertencia, rendimiento u optimización y mala práctica.

| N | Línea | Clasificación | Causa | Corrección |
|---|-------|---------------|-------|------------|
| 1 | 18-20 | Rendimiento u optimización | El efecto no tiene array de dependencias. Se ejecuta después de cada render. Cada respuesta cambia el estado, cada cambio dispara otro render y cada render dispara otro pedido. Es el mismo caso que el ejercicio 4 de mi TP 1 | Agregar `[]` como segundo argumento. Mejor todavía, usar el catálogo compartido: `useCatalogo()` (src/context/CatalogoContext.tsx:20-26) |
| 2 | 19 | Error de ejecución | `obtenerLibros().then(...)` no tiene catch. En esta app el pedido falla 1 de cada 5 veces (src/lib/api.ts:9-11). La promesa rechazada queda sin atender. La persona no ve ningún mensaje y la lista queda vacía | Manejar el error y mostrar un mensaje con botón "Reintentar", como hace src/hooks/useLibros.ts:26-29 |
| 3 | 14-15 | Mala práctica | Pide cámara y notificaciones apenas se abre el Catálogo. Esta pantalla no usa ninguna de las dos. La persona ve diálogos sin contexto y sin saber para qué. Además no se mira lo que responde el sistema | Pedir cada permiso al usar la función: la cámara al abrir el escáner (src/app/escanear.tsx:25-30) y las notificaciones al activar "Recordarme" (src/app/(tabs)/reservas.tsx:80-91) |
| 4 | 10 y 22 | Mala práctica | `any[]` y `libro: any` apagan el chequeo de tipos. Un error de nombre, como `libro.titlo`, no se detecta | Usar el tipo Libro de src/types/index.ts:1-7 |
| 5 | 22-30 | Mala práctica | `Fila` se declara dentro de `Catalogo`. En cada render es una función nueva, así que React la toma como otro componente. Desmonta y vuelve a montar todas las filas, y pierden su estado. Es el ejercicio 8 de mi TP 1 | Sacarla a su propio archivo. En mi app es src/components/FilaLibro.tsx |
| 6 | 33-36 | Rendimiento u optimización | `ScrollView` con `map` crea todas las filas de una vez. Con 16 libros no se nota. Con un catálogo real de miles de libros, el arranque se vuelve lento. Es el ejercicio 6 de mi TP 1 | Usar `FlatList`, como en src/app/(tabs)/(catalogo)/index.tsx:24-32 |
| 7 | 35 | Mala práctica | `key={i}` usa la posición. Si la lista se reordena o se filtra, React asocia el estado de una fila con otro libro. Con una clave faltante React avisaría. Con índice no avisa, y por eso el error pasa desapercibido | Usar el ISBN: `keyExtractor={(libro) => libro.isbn}` (index.tsx:28) |
| 8 | 24 | Mala práctica | `router.push('/libro/' + libro.isbn)` arma la ruta pegando texto. El proyecto tiene `typedRoutes: true` (app.json:55). Un texto armado a mano pierde la comprobación de rutas. No lo compilé, pero creo que tsc lo rechazaría, porque el tipo Href espera rutas conocidas | Usar `router.push({ pathname: '/libro/[isbn]', params: { isbn: libro.isbn } })`, como src/components/FilaLibro.tsx:13-15 |
| 9 | 37-39 | Mala práctica | El botón de la cámara es un ícono dentro de un Pressable sin `accessibilityRole` ni `accessibilityLabel`. Un lector de pantalla no sabe qué hace. El ícono mide 28 y no hay un área mínima de toque. Además queda al final de la lista y hay que bajar para encontrarlo | Usar un botón con rol y etiqueta, y un área mínima de toque. Mi app usa BotonEnlace en la cabecera (src/components/CabeceraCatalogo.tsx:32-33) y tamanios.toqueMinimo (src/components/Boton.tsx:35-36) |
| 10 | 25 | Mala práctica | Estilo en línea con valores sueltos: `fontSize: 16`, `color: '#333'`, `padding: 12`. Se crea un objeto nuevo en cada render y los valores no vienen de ningún tema. Es el ejercicio 3 de la parte B de mi TP 1 | Usar `StyleSheet.create` y las constantes de src/constants/tema.ts, con el componente Texto |
| 11 | 11 y 5 | Advertencia | `permiso` se declara y no se usa. Un linter con la regla de variables sin uso lo marca. No lo corrí sobre este fragmento | Quitar el hook de la cámara de esta pantalla |
| 12 | 7 | Mala práctica | La importación `'../../lib/api'` es relativa y se rompe si se mueve el archivo. El proyecto usa el alias `@/` | Importar con el alias, como en src/hooks/useLibros.ts:3 |
| 13 | 9-41 | Mala práctica | La pantalla no tiene estados de carga, error ni vacío. Mientras carga se ve una pantalla en blanco | Usar EstadoCargando, EstadoError y EstadoVacio (src/app/(tabs)/(catalogo)/index.tsx:16-21) |

Detalle del problema 3 en Android 13 o superior: la línea 15 llama a requestPermissionsAsync sin crear antes un canal. Según la documentación de Expo, el diálogo no aparece hasta que existe un canal. Por eso en ese teléfono es posible que el pedido de notificaciones ni siquiera muestre el diálogo. No verificado en dispositivo.

b) El primer minuto con el efecto de las líneas 18 a 20 sin array de dependencias. Los tiempos salen del código de src/lib/api.ts. No lo probé en un teléfono.

1. En el segundo cero se renderiza `Catalogo` con `libros` vacío. Solo se ve el botón de la cámara.
2. Después del primer render corren los efectos en orden. El primero pide la cámara y las notificaciones. El segundo llama a `obtenerLibros()`.
3. `obtenerLibros()` espera 800 milisegundos (api.ts:8). Con probabilidad de 1 en 5 lanza un error (api.ts:9-11). Si no falla, devuelve `LIBROS.map((libro) => ({ ...libro }))`, que es un arreglo nuevo con objetos nuevos (api.ts:12).
4. Cerca del segundo 0,8 llega la respuesta y `setLibros` recibe un arreglo distinto del que había. React renderiza otra vez y aparecen los 16 libros.
5. Como no hay array de dependencias, ese render ejecuta el efecto otra vez. Empieza un pedido nuevo.
6. Cerca del segundo 1,6 llega otro arreglo nuevo. Se repite el render y el efecto. Esto continúa cada 0,8 segundos.
7. En cada render `Fila` es una función nueva (línea 22). Las 16 filas se desmontan y se montan de nuevo cada 0,8 segundos. La lista parpadea y un toque a medias sobre una fila se puede perder.
8. La pantalla del Catálogo sigue montada debajo del detalle. Los pedidos continúan aunque la persona no la esté viendo.

Qué pasa en la práctica con esta api:

- La falla de 1 en 5 corta el ciclo. Una respuesta con error no llama a `setLibros`, así que no hay render y el efecto no corre otra vez. Como el pedido no tiene catch, el rechazo queda sin atender.
- El número esperado de pedidos exitosos antes de la primera falla es 0,8 dividido 0,2, o sea 4.
- La probabilidad de llegar a 75 ciclos seguidos, que son los que caben en un minuto, es 0,8 elevado a 75, cerca de 5 por 10 a la menos 8. Es prácticamente nula.
- En esta app el ciclo se corta solo a los pocos segundos y deja la lista vieja. Si la falla ocurre en el primer pedido, la pantalla queda vacía sin mensaje. Eso pasa 1 de cada 5 aperturas.
- Con un servidor estable, que no falla, el ciclo seguiría sin límite. Serían unos 75 pedidos y 75 renders en el primer minuto, con parpadeo, gasto de batería y de datos.

¿Cambiaría algo si `obtenerLibros()` devolviera siempre el mismo arreglo? Sí, el ciclo se cortaría solo.

- Primer pedido: `setLibros(A)` recibe A, distinto del arreglo vacío inicial. Hay un render y el efecto corre otra vez.
- Segundo pedido: `setLibros(A)` recibe el mismo A. React compara con `Object.is`. Si el valor es igual, no vuelve a renderizar a los hijos ni ejecuta efectos.
- El ciclo termina con dos pedidos.
- Esto es una casualidad y no una corrección. El efecto sigue mal escrito: no declara de qué depende. Mi api devuelve copias (api.ts:12) a propósito, para que nadie modifique los datos originales.

c) Pantalla reescrita con los hooks, componentes y constantes de mi app. Es el archivo real src/app/(tabs)/(catalogo)/index.tsx:

```tsx
import { FlatList, StyleSheet } from 'react-native';

import { CabeceraCatalogo } from '@/components/CabeceraCatalogo';
import { EstadoCargando } from '@/components/EstadoCargando';
import { EstadoError } from '@/components/EstadoError';
import { EstadoVacio } from '@/components/EstadoVacio';
import { FilaLibro } from '@/components/FilaLibro';
import { colores, espaciado } from '@/constants/tema';
import { useBiblioteca } from '@/context/BibliotecaContext';
import { useCatalogo } from '@/context/CatalogoContext';

export default function Catalogo() {
  const { libros, cargando, error, reintentar } = useCatalogo();
  const { recientes } = useBiblioteca();

  let estadoVacio = <EstadoVacio mensaje="Todavía no hay libros en el catálogo." />;
  if (cargando) {
    estadoVacio = <EstadoCargando mensaje="Cargando el catálogo..." />;
  } else if (error !== null) {
    estadoVacio = <EstadoError mensaje={error} onReintentar={reintentar} />;
  }

  return (
    <FlatList
      style={estilos.lista}
      contentContainerStyle={estilos.contenido}
      data={libros}
      keyExtractor={(libro) => libro.isbn}
      renderItem={({ item }) => <FilaLibro libro={item} />}
      ListHeaderComponent={<CabeceraCatalogo recientes={recientes} />}
      ListEmptyComponent={estadoVacio}
    />
  );
}

const estilos = StyleSheet.create({
  lista: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espaciado.l,
    gap: espaciado.s,
  },
});
```

Cómo se corrige cada problema con las piezas de mi app:

| Problema | Dónde queda resuelto |
|----------|----------------------|
| Efecto sin dependencias y sin catch (1 y 2) | src/hooks/useLibros.ts:18-34. El efecto depende de `[intento]`, descarta respuestas viejas con la bandera `vigente` y atrapa el error. ProveedorCatalogo lo ejecuta una sola vez en el layout raíz (src/context/CatalogoContext.tsx:15-18) |
| Permisos al abrir (3) | Ya no se piden acá. El escáner usa usePermiso y la pantalla previa. Las notificaciones se piden desde "Recordarme" |
| any (4) | `Libro` en src/types/index.ts |
| Fila interna (5) | src/components/FilaLibro.tsx |
| ScrollView y map (6) | FlatList, líneas 24-32 |
| key por índice (7) | keyExtractor con el ISBN, línea 28 |
| Ruta armada con texto (8) | FilaLibro.tsx:13-15 |
| Botón de la cámara (9) | BotonEnlace "Escanear" dentro de CabeceraCatalogo, con rol de botón y tamaño mínimo |
| Estilos en línea (10) | StyleSheet y constantes de tema |
| Estados de carga, error y vacío (13) | Variable `estadoVacio`, líneas 16-21 |

Una diferencia con el archivo del compañero: mi pantalla está en `src/app/(tabs)/(catalogo)/index.tsx` y no en `src/app/(tabs)/index.tsx`. El grupo (catalogo) es una pila propia dentro de las pestañas, para que el detalle del libro se abra sin ocultar la barra de pestañas (src/app/(tabs)/(catalogo)/_layout.tsx:11-21).

d) Qué provocaría el rechazo en una tienda y qué haría desinstalar la app.

Podría provocar el rechazo: los pedidos de permisos al abrir (líneas 11, 14 y 15).

- La pantalla pide la cámara y las notificaciones sin que ninguna función visible las use en ese momento.
- La documentación de Android que consulté en esta sesión recomienda pedir el permiso de notificaciones "in the correct context" y esperar a que la persona conozca la app (https://developer.android.com/develop/ui/views/notifications/notification-permission, secciones "Wait to show notification permission prompt" y "Request the permission in context").
- Un revisor de una tienda mira que el permiso se pida cuando se usa la función y que el texto explique el motivo. Eso es mi criterio de revisión, no una cita.
- No verificado: no abrí el texto vigente de las guías de revisión de Apple ni de Google Play en esta sesión. Antes de entregar a una tienda las leería.

Haría que una persona desinstale primero: el efecto sin array de dependencias junto con `Fila` dentro del componente (líneas 18-20 y 22-30).

- La persona lo nota en el primer segundo. Con un servidor estable, la lista se vuelve a armar cada 0,8 segundos. Parpadea, se pierden toques y se gasta batería y datos.
- Con la api de esta app, el ciclo termina solo y deja una pantalla vacía sin mensaje en 1 de cada 5 aperturas.
- Los permisos, en cambio, se pueden rechazar con un toque y la app sigue funcionando.

### E2. Organización y acoplamiento

a) Quién importa a quién. Lo revisé con grep sobre las importaciones de src.

| Carpeta | Importa de |
|---------|------------|
| app | components, constants, context, hooks, lib, types |
| components | components, constants, context, hooks, lib, types |
| context | constants, data, estructuras, hooks, lib, types |
| hooks | lib, types |
| lib | constants, data, types y otros archivos de lib |
| data | types |
| estructuras, constants, types | nada del proyecto |

Detalle de lo que encontré:

- Ningún archivo fuera de src/app importa algo de src/app. La búsqueda de "@/app" y "/app/" fuera de esa carpeta no dio resultados. No hay importaciones hacia arriba.
- components importa de context en dos archivos: src/components/EnlacePersonal.tsx:6 y src/components/NavegacionRaiz.tsx:5. Ambos usan useBiblioteca. No es una importación hacia arriba, pero esos dos componentes quedan atados al Context y no se pueden reutilizar sin él.
- components importa de hooks una sola vez: PantallaPrevia usa usePermiso (src/components/PantallaPrevia.tsx:7).
- context importa de hooks una sola vez: CatalogoContext usa useLibros (src/context/CatalogoContext.tsx:3).
- lib/permisos.ts importa de lib/notificaciones.ts para crear el canal (src/lib/permisos.ts:4). No hay ciclo, porque notificaciones.ts solo importa constants y types.
- src/lib/api.ts importa con rutas relativas (`../data/libros`) y no con el alias `@/` (api.ts:1-2). Es una inconsistencia menor.
- context/BibliotecaContext.tsx importa directamente de data (`ESPERA_INICIAL`, línea 13). Salta la capa de lib/api. Lo retomo en b).

Por qué una importación hacia arriba sería un problema:

- Si un hook importara algo de src/app, la capa de abajo dependería de una pantalla. No se podría reutilizar el hook sin arrastrar esa pantalla.
- Se pueden formar ciclos de importación. Con ciclos, un valor puede llegar como undefined al cargar los módulos.
- Los archivos de src/app son rutas. Expo Router los convierte en pantallas por su nombre. Importar desde ahí mezcla navegación con lógica.

b) Si el catálogo viniera de una API real, cambiarían estos archivos:

| Archivo | Por qué cambia |
|---------|----------------|
| src/lib/api.ts | Hay que reemplazar la simulación (`esperar`, la falla aleatoria y `LIBROS`) por un pedido de red real en obtenerLibros y buscarLibros (líneas 7-23). Es el cambio principal |
| src/data/libros.ts | Dejaría de ser la fuente de los libros. Podría quedar solo como datos de prueba |
| src/types/index.ts | Cambia solo si la respuesta de la API no tiene la misma forma que `Libro` |
| src/context/BibliotecaContext.tsx | Importa `ESPERA_INICIAL` de data/libros.ts (línea 13) para armar las colas iniciales (líneas 45-55). Si las listas de espera también vinieran del servidor, hay que cambiarlo |

Lo que no cambiaría para leer el catálogo: useLibros, useBusqueda, CatalogoContext y las pantallas. Todos llaman a obtenerLibros o buscarLibros y trabajan con el tipo `Libro`.

Lo que dice esto de mi diseño:

- Para solo leer el catálogo, el cambio real está en uno o dos archivos: api.ts y data/libros.ts, con types/index.ts solo si cambia la forma de los datos. Eso indica que la fuente de datos quedó aislada en lib/api.ts.
- La cuarta fila es un problema de diseño. BibliotecaContext.tsx lee data/libros.ts sin pasar por lib/api.ts, así que la lista de espera inicial no pasa por la capa de datos. Debería pedirse con una función de api.ts, igual que los libros.
- Si además las reservas se hicieran contra el servidor, el cambio sería mayor. reservar, devolver y entregarSiguiente (BibliotecaContext.tsx:108-218) modifican estado local. Y calcularDisponibles (src/lib/reservas.ts:8-11) calcula los ejemplares disponibles con los préstamos locales. Con servidor, la disponibilidad la tendría que informar el servidor. Esos archivos sí cambiarían.
- Otro cambio posible: cancelar pedidos con AbortController en lugar de la bandera `vigente` de useLibros.ts:19. Tocaría api.ts y los dos hooks.

c) Evaluación de un componente `<ConPermiso recurso="camara">` que reemplace a usePermiso y la pantalla previa.

Lo que ganaría:

- Un solo lugar con los cuatro estados (cargando, concedido, preguntable y bloqueado). Hoy están repartidos entre escanear.tsx:25-30, ZonaCamara.tsx:34-85 y PantallaPrevia.tsx:28-52.
- Menos código en cada pantalla que use la cámara. escanear.tsx no tendría que saber de estados de permiso.
- Mensajes iguales en todas las pantallas.

Lo que perdería:

- La pantalla previa como ruta. Hoy /permisos/[recurso] es un modal (src/components/NavegacionRaiz.tsx:20) con enlace propio y con la regla de abrirse una sola vez por apertura (previaMostrada, escanear.tsx:23-30). Un envoltorio mostraría la explicación en el lugar de la cámara y tendría que reimplementar esa regla.
- La alternativa manual. El escáner mantiene el formulario del ISBN visible aunque la cámara esté bloqueada (escanear.tsx:85). Si el componente envolviera toda la pantalla, ocultaría esa alternativa. Solo serviría envolviendo la zona de la cámara, con una prop para el contenido alternativo.
- El estado "concedido pero la cámara no abre" (`falloCamara`, ZonaCamara.tsx:53-63). El envoltorio decide por el permiso y no sabe del fallo de montaje.
- usePermiso no desaparece. El componente lo usaría por dentro, porque ahí está el almacén compartido y el oyente de AppState (usePermiso.ts:7-64). Se reemplazaría solo la presentación.

¿Serviría para las notificaciones? No.

- Las notificaciones no se piden al abrir una pantalla. Se piden al tocar el interruptor "Recordarme" (src/app/(tabs)/reservas.tsx:80-91).
- No hay nada que envolver. La pantalla "Mis reservas" se ve siempre, con o sin permiso.
- Hace falta recordar la acción pendiente y retomarla cuando el permiso se concede (reservas.tsx:58 y 63-69). Un componente que decide qué dibujar no puede expresar eso.
- Para las notificaciones sigue siendo mejor el hook usePermiso con la lógica en la pantalla.
- Mi conclusión es que el envoltorio sirve para la cámara y para pantallas parecidas. No es un reemplazo general.

### E3. Mapa de fallas

| Situación | Qué ve la persona | Dónde se maneja |
|-----------|-------------------|-----------------|
| obtenerLibros() falla | En el Catálogo, el mensaje "No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo." con el botón "Reintentar". Lo mismo se ve en el detalle, en el modal de reserva, en el escáner y en el mostrador | Lanza el error src/lib/api.ts:9-11. Lo atrapa src/hooks/useLibros.ts:26-29 y arma el mensaje en la línea 42. Se muestra en src/app/(tabs)/(catalogo)/index.tsx:19-21. Otras pantallas: src/app/(tabs)/(catalogo)/libro/[isbn].tsx:57-64, src/app/reservar/[isbn].tsx:49-56, src/app/escanear.tsx:78 y src/app/mostrador.tsx:52-53 |
| Se abre /libro/abc | Mensaje rojo "El ISBN no es válido. Tiene que tener 13 números, sin guiones." y el enlace "Ir al Catálogo". No se ve el indicador de carga | src/app/(tabs)/(catalogo)/libro/[isbn].tsx:37-47. La validación está en src/lib/isbn.ts:3-5 |
| Se escanea un ISBN que no está en el catálogo | Aviso "El libro con ISBN ... no está en el catálogo. Probá con otro código." y el botón "Seguir escaneando" | src/app/escanear.tsx:40-44 arma el aviso. Se muestra en las líneas 79-84. El botón limpia el aviso en las líneas 57-60 |
| La cámara está bloqueada | Mensaje "La cámara está bloqueada. Activala en Ajustes o escribí el ISBN." con la ruta de Ajustes y el botón "Abrir Ajustes". El formulario del ISBN sigue disponible | src/components/ZonaCamara.tsx:65-75. El estado se calcula en src/lib/permisos.ts:36-44 |
| Las notificaciones están denegadas | En "Mis reservas", arriba: "Las notificaciones están bloqueadas. Los avisos aparecen acá, dentro de la app." Si el sistema todavía permite preguntar, dice "Las notificaciones no están activadas. Se piden al activar Recordarme". Al tocar el interruptor se abre la pantalla previa. En estado bloqueado dice que hay que activarlas en Ajustes y ofrece "Abrir Ajustes". Cuando entregan un libro, el aviso aparece en la sección "Avisos" | src/app/(tabs)/reservas.tsx:43-51 y 85-90. src/components/PantallaPrevia.tsx:32-41. El aviso: src/context/BibliotecaContext.tsx:204 y 214 |
| Se intenta reservar un libro ya reservado | El botón "Confirmar" queda deshabilitado y se ve "Ya reservaste este libro. No se puede reservar dos veces." | src/app/reservar/[isbn].tsx:67-68, 76-77 y 97. Segunda defensa: el Context devuelve el resultado repetida (BibliotecaContext.tsx:111-115) y la pantalla muestra el error (reservar/[isbn].tsx:34-36) |
| "Entregar al siguiente" con la lista de espera vacía | El mostrador solo lista libros con espera, así que ese botón normalmente no aparece. Si se llega igual, por ejemplo con dos toques seguidos, se ve "No hay nadie en la lista de espera de ..." en tono de aviso. Sin libros con espera se ve "No hay libros con lista de espera." | src/app/mostrador.tsx:27 filtra. El camino vacío es mostrador.tsx:31-36, que recibe undefined de BibliotecaContext.tsx:199-202. El mensaje de lista vacía: mostrador.tsx:49 |
| Login con clave incorrecta | Mensaje rojo "El usuario o la clave no son correctos." Los campos no se borran | src/app/login.tsx:19-22. La comparación está en src/lib/autenticacion.ts:3-5 |

Situaciones donde el manejo es débil o no existe. No las corregí:

- "Mis reservas" no muestra el error del catálogo. Si obtenerLibros falla, la lista de espera muestra el título como "Libro" más el ISBN (src/lib/reservas.ts:32). No hay mensaje ni botón "Reintentar" en esa pestaña.
- Si la persona rechaza el permiso en la pantalla previa de notificaciones, el interruptor queda apagado y no aparece un mensaje que lo explique. Solo cambia el texto de la cabecera.
- Los avisos y los préstamos viven en memoria. Se pierden al cerrar la app (ver D2 b).
- El caso de "Entregar al siguiente" con lista vacía solo se alcanza con una carrera de toques. No lo probé.
- Si programar el recordatorio falla, sí hay manejo: se agrega el aviso "No pudimos programar el recordatorio de ... Intentá de nuevo." (BibliotecaContext.tsx:169-171).

### E4. Decisiones con argumentos

a) Identificador. Elegí el ISBN como parámetro de ruta y como key.

Argumentos a favor:

- Dos ediciones del mismo título tienen ISBN distintos. El ISBN identifica la edición, que es lo que presta una biblioteca. Un id numérico propio no agrega esa información.
- El ISBN viene del código de barras. El escáner lo lee y lo usa directo: `libros.find((item) => item.isbn === isbn)` (src/app/escanear.tsx:40). Con un id propio necesitaría una tabla de equivalencias.
- useLocalSearchParams devuelve texto, y a veces una lista de textos. Esto es lo que vi en el ejercicio E1 del TP 2. Mi función leerParametro lo resuelve (src/lib/parametros.ts:1-6).
- Con un id numérico tendría que convertir con Number y validar que no sea NaN. Además, el ISBN es un texto. Un ISBN-10 puede empezar con cero. Convertido a número, perdería ese cero.
- Uso el mismo valor en los tres lugares: la ruta `/libro/[isbn]` y `/reservar/[isbn]`, el keyExtractor (index.tsx:28) y el resultado de la reserva (por ejemplo `'propia-' + libro.isbn`, BibliotecaContext.tsx:127).

Puntos débiles que tiene mi elección:

- Un libro sin ISBN no entra en mi app. `esIsbnValido` exige 13 números (src/lib/isbn.ts:3-5) y la ruta lo valida. Los libros antiguos pueden no tener ISBN. Si la biblioteca los tuviera, necesitaría un id propio en texto, no numérico.
- El ISBN identifica el título y la edición, no el ejemplar físico. Mi app resuelve eso con el campo `ejemplares`, que es una cantidad (src/types/index.ts:6).
- `esIsbnValido` solo mira el largo y que sean números. No calcula el dígito verificador. Lo reconozco como una limitación.
- El ISBN no alcanza como key en la lista de vistos recientemente. Una Pila puede guardar el mismo libro dos veces, porque registrarVisto solo evita repetir el último (BibliotecaContext.tsx:93-95). Por eso CabeceraCatalogo agrega un número a la clave (src/components/CabeceraCatalogo.tsx:19-26).

b) Estructuras. Elegí la clase con `#items`, aunque con reservas.

Lo que me dio la clase:

- Encapsulamiento. `#items` es privado y nadie puede cambiar la estructura sin pasar por sus métodos (src/estructuras/Pila.ts:1-30 y src/estructuras/Cola.ts:1-40).
- Una interfaz que expresa la regla de negocio: `push`, `pop`, `tope`, `encolar`, `desencolar`, `frente`.
- En la Cola, `desencolar` mueve un índice `#frente` y solo recorta el arreglo de vez en cuando (Cola.ts:9-20). Con un arreglo en el estado y `slice` o `shift` se copiaría o desplazaría la lista en cada entrega.
- `aArray()` devuelve una copia (Pila.ts:27-29 y Cola.ts:37-39), para que nadie modifique el contenido por fuera.

Lo que me complicó al combinarla con React:

- React compara por referencia. Si cambio una instancia de clase por dentro, la referencia no cambia y React no vuelve a renderizar.
- Por eso guardo la instancia en `useState` con función inicializadora (BibliotecaContext.tsx:66-67). Después de cada cambio copio el contenido a un estado normal con `aArray()`: en `registrarVisto` (línea 97), en `reservar` (línea 129) y en `entregarSiguiente` (línea 200).
- Ese diseño tiene dos copias del mismo dato, la estructura y el estado. Si alguien modifica la estructura y olvida copiar, la pantalla queda desactualizada. Para reducir ese riesgo existe una sola función de copia para las colas, `copiarEsperas` (líneas 57-63).
- Tuve que mutar la estructura fuera de las funciones que se pasan a `setState`. React puede ejecutar esas funciones dos veces en desarrollo y se duplicaría el `push`. En `registrarVisto` el `push` está fuera del setState (líneas 93-97).
- El proyecto tiene el compilador de React activado (app.json:56). Según entiendo, el compilador asume que los valores del estado no se modifican durante el render. Mis mutaciones ocurren dentro de funciones que se ejecutan por eventos, no durante el render. tsc y lint terminan sin errores. No verifiqué cómo se comporta el compilador con estas clases en un teléfono.

Mi conclusión: para solo guardar tres libros vistos, un arreglo con `[libro, ...recientes].slice(0, 3)` sería más simple y más natural en React. Mantuve la clase porque el trabajo pide usar Pila y Cola. La Cola es donde la clase aporta más.

c) Memorización. Sí usé useMemo y useCallback.

Dónde aportan:

- El `value` del Context (BibliotecaContext.tsx:220-251). Es un objeto con 13 campos. Sin useMemo sería un objeto nuevo en cada render del proveedor, y todos los componentes que llaman a useBiblioteca se volverían a renderizar. Esos son NavegacionRaiz, EnlacePersonal, el Catálogo, el detalle, "Mis reservas", el modal de reserva, el mostrador y el login.
- Las funciones del Context llevan useCallback (líneas 83-218) para que el objeto del value no cambie sin motivo.
- `registrarVisto` (líneas 91-100) es un caso claro. El detalle del libro la usa como dependencia de un efecto (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:27-31). Sin una referencia estable, el efecto correría en cada render.
- `revisar` en usePermiso (src/hooks/usePermiso.ts:37-39) también. Es dependencia de dos efectos (líneas 51-64). Sin useCallback, el oyente de AppState se suscribiría de nuevo en cada render.

Dónde serían ruido:

- `armarItems` y `obtenerReservasEnEspera` en src/app/(tabs)/reservas.tsx:60-61. Recorren listas de pocos elementos, 16 libros como máximo. Envolverlos en useMemo exigiría cuatro dependencias (prestamos, esperas, libros, avisos). Comparar cuatro dependencias cuesta casi lo mismo que recalcular.
- `abrirDetalle` en src/components/FilaLibro.tsx:13-15. Se pasa a un Pressable, que no está memorizado. Una referencia estable no evita ningún render.
- `librosConEspera` en src/app/mostrador.tsx:27. Es un filtro de 16 elementos.

Una aclaración honesta: el compilador de React está activado (app.json:56). Según su documentación, memoriza valores y funciones de los componentes automáticamente. Por eso el useMemo del value puede ser redundante en esta app. Lo dejé porque es explícito y no depende de que el compilador acepte el archivo. Además, el proveedor casi no se vuelve a renderizar por otros motivos. LayoutRaiz no tiene estado (src/app/_layout.tsx:12-20). Cuando cambia el estado de ProveedorCatalogo, su hijo ProveedorBiblioteca llega como el mismo elemento creado en LayoutRaiz, y React no lo vuelve a renderizar. No mido qué tanto ayuda.

Cómo lo comprobaría en lugar de suponerlo:

1. Abriría React DevTools conectado a la app y usaría la pestaña Profiler.
2. Activaría "Record why each component rendered".
3. Grabaría una sesión con una acción que cambie solo una parte del estado, por ejemplo abrir un libro, que cambia `recientes`.
4. Contaría cuántas veces se renderiza un consumidor que no usa ese dato, como EnlacePersonal.
5. Repetiría la prueba quitando el useMemo del value. También con `experiments.reactCompiler` en false en app.json, para separar el efecto del compilador.
6. Compararía la cantidad de renders y el tiempo de cada confirmación. Si los números son iguales, la memorización es ruido y la quitaría.
7. Otra opción sin DevTools es envolver un componente con el componente Profiler de React y contar los renders con su función onRender.

No verificado: no ejecuté el Profiler en esta sesión.

d) Datos duplicados. Calculo los ejemplares disponibles y no los guardo.

- El dato guardado es `libro.ejemplares`, la cantidad total (src/types/index.ts:6).
- La disponibilidad se calcula en src/lib/reservas.ts:8-11: `Math.max(0, libro.ejemplares - prestados)`. Los prestados salen de contar los préstamos del libro.
- Se calcula en tres lugares: el detalle (src/app/(tabs)/(catalogo)/libro/[isbn].tsx:75), el modal de reserva (src/app/reservar/[isbn].tsx:69) y la decisión de prestar o encolar (BibliotecaContext.tsx:116). Los tres usan la misma función.

El error que aparece cuando un mismo dato vive en dos lugares:

- Si guardara `disponibles` en el estado, cada acción tendría que actualizar dos cosas: la lista de préstamos y el contador.
- Ejemplo con Don Quijote de la Mancha, que tiene 1 ejemplar (src/data/libros.ts). La persona lo reserva. Se agrega el préstamo y baja el contador a 0. Después lo devuelve. Si devolver() quita el préstamo y olvida subir el contador, el detalle seguiría diciendo "Ejemplares disponibles: 0" y la reserva iría a la cola con el libro en el estante.
- Otro caso: una falla a mitad de camino deja el préstamo cargado y el contador sin cambiar. Las dos pantallas mostrarían números distintos.

Cómo lo evita mi diseño:

- devolver() solo quita el préstamo (BibliotecaContext.tsx:135-147). La disponibilidad se recalcula sola en todas las pantallas, porque nadie guarda el número.
- Hay una sola fuente de verdad: la lista de préstamos.

Duplicaciones que sí quedan en mi app. Las señalo porque el criterio también las pide:

- Las instancias de Pila y Cola y sus copias en `recientes` y `esperas`. Ya las traté en b).
- `Prestamo.titulo` copia el título del libro (src/types/index.ts:21 y BibliotecaContext.tsx:119-124). Lo hice para armar el texto del recordatorio sin volver a buscar el libro (src/lib/notificaciones.ts:53). Si el catálogo cambiara un título, el préstamo mostraría el viejo.
- `prestamosActuales` es una referencia que copia el estado `prestamos` con un efecto (BibliotecaContext.tsx:69 y 79-81). La uso para saber, después de una espera asíncrona, si el préstamo sigue vigente (línea 159). La referencia se actualiza después de que React confirma el render, no en el mismo momento del cambio. Por eso hay una ventana muy corta donde podría estar desactualizada. En la práctica, programar la notificación tarda más que eso, pero no es una garantía.
