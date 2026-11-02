# Verificación de reglas y arquitectura

La referencia normativa de juego es [BALANCE_COMBATE.md](BALANCE_COMBATE.md).
El estado de campaña está en [AUDITORIA_CAMPAIGN.md](AUDITORIA_CAMPAIGN.md).

## Reglas verificadas

- Personaje nivel 1–60, habilidades rango 1–3 y cinco rangos gratuitos.
- 38 habilidades por personaje; 109 PR para completarlas en los 24 órdenes.
- Perfiles de misión 25/50/75/100 % y principales introductorias al 100 %.
- Presupuesto fijo por nivel recomendado, reparto 60/40 y bonos aplicados una vez.
- Compra explícita y predecesoras con rango mínimo; equipo y práctica coherentes.
- Chakra base 60, recuperación normal 5 y Guardia 25 CH totales.
- Iniciativa temporal de una acción y preparación proporcional a los sellos.
- Persistencia por pasos, cobro único y confirmación diferida de victoria.

## Comandos reproducibles

- `npm test`: reglas puras, persistencia, contenido y arquitectura.
- `npm run smoke`: recorridos de navegador.
- `npm run metrics`: tamaños y estructura de los archivos del proyecto.
- `node scripts/audit-balance.mjs --json=artifacts/balance-current.json`:
  presupuesto, rutas y sondas de combate de las reglas registradas.

Las métricas de rendimiento gráfico se documentan en
[RENDIMIENTO_PHASER_4.md](RENDIMIENTO_PHASER_4.md), separadas del balance jugable.
