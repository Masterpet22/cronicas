# Métricas de la Fase 6 · Guardado v17

Fecha de cierre: 19 de octubre de 2026.

- `SAVE_VERSION` subió de 16 a 17 con una migración pura y separada.
- Los tres fixtures v16 conservaron historial, decisiones y recompensas; cada uno se normaliza a v17.
- `campaign.missionProgress` registra estado, paso actual, pasos completados, contexto, efectos aplicados e intentos.
- Al abrir una misión se guarda su primer paso pendiente. Volver a iniciarla conserva cursor/contexto e incrementa intentos; el combate en curso se reinicia.
- Diecisiete indicadores derivados de campaña ya no se serializan. La interfaz y los requisitos los consultan desde historiales, decisiones y hechos canónicos.
- `save.js` conserva el API público y delega migraciones, cursor de campaña, estado de personaje y persistencia de ranuras en módulos propios.
- Campos de `campaign` en el esquema por defecto: 20 (36 al comenzar la auditoría de la Fase 1).
- `npm test`: 17 suites correctas.
- `npm run smoke`: 4 recorridos correctos; incluye finalización persistida de `m01` y `m05` con v17.
