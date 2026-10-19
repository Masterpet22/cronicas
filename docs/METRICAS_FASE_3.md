# Métricas de la Fase 3 — Vistas meta

Fecha de cierre: 2026-10-19  
Rama: `refactor/fase-3-vistas-meta`

## Resultado

| Indicador | Entrada | Salida |
|---|---:|---:|
| Líneas en `src/meta-ui.js` | 1281 | 300 |
| Vistas con contrato explícito | 0 | 7 |
| Vista más extensa | 1281 | 244 |
| Smokes de navegador | 1 | 2 |

Las siete fábricas de vista implementan `id`, `render`, `mount` y `dispose`. Los listeners de las vistas y la infraestructura compartida se registran mediante el scope abortable del runtime.

## Módulos extraídos

- `debug-tools.js`: 47 líneas
- `archive.js`: 49 líneas
- `dojo.js`: 244 líneas
- `mission-boards.js`: 219 líneas
- `village.js`: 183 líneas
- `save-creator.js`: 87 líneas
- `overlays.js`: 81 líneas
- Infraestructura: `meta-shell.js` (107 líneas) y `location-stage.js` (120 líneas)

## Verificación

- `npm test`: verde.
- `npm run smoke`: 2/2 pruebas verdes.
- El smoke recorre selección de partida, creador, Cuartel, Tablón, Kagemori, Dojo, Biblioteca, mapa de aldea y ruta del doctor.
- La prueba arquitectónica falla si `meta-ui.js` supera 300 líneas, una vista supera 400 o falta el contrato de ciclo de vida.
- Durante el recorrido se detectó y corrigió que el encargo del doctor abría Phaser en lugar de navegar a `doctor-route`.

