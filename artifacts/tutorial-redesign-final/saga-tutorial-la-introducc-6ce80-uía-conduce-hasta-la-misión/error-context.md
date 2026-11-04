# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saga-tutorial.spec.mjs >> la introducción y el briefing tienen una sola voz y la guía conduce hasta la misión
- Location: tests\saga-tutorial.spec.mjs:87:1

# Error details

```
Test timeout of 150000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f2e2]:
  - generic "Controles generales":
    - generic:
      - paragraph: RPG 2D POR TURNOS
      - heading "Crónicas del Sello" [level=1]
    - group:
      - generic "Ajustes":
        - generic [aria-hidden]: ⚙
        - text: Ajustes
  - region "Dojo y progreso del personaje" [ref=f2e3]:
    - generic [ref=f2e4]:
      - generic [ref=f2e5]:
        - generic [ref=f2e6]:
          - generic [ref=f2e8]:
            - paragraph [ref=f2e9]: RANGO 1 · NOVICIO
            - heading "Novicio" [level=2] [ref=f2e10]
          - generic "Nivel 1" [ref=f2e11]:
            - generic [ref=f2e12]: NIVEL
            - strong [ref=f2e13]: "1"
        - generic "Progreso de la partida" [ref=f2e14]:
          - generic "0 de 120 puntos de experiencia" [ref=f2e15]:
            - strong [ref=f2e17]: 0/120
            - generic [ref=f2e18]: PX
          - generic "0 monedas" [ref=f2e19]:
            - strong [ref=f2e21]: "0"
            - generic [ref=f2e22]: monedas
        - generic "Acciones de la partida" [ref=f2e23]:
          - button "Abrir ajustes" [ref=f2e24]
      - button "Abrir herramientas de pruebas" [ref=f2e25]:
        - generic [ref=f2e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=f2e27]:
        - button "← Volver al mapa" [ref=f2e28]
        - button "Pedir ayuda al maestro" [ref=f2e29]
      - region "Cuartel General" [ref=f2e30]:
        - generic [ref=f2e32]:
          - generic [ref=f2e33]:
            - generic [ref=f2e34]:
              - paragraph [ref=f2e35]: CENTRO DE MANDO
              - heading "Selecciona una saga" [level=2] [ref=f2e36]
            - strong [ref=f2e37]: 0/1 completadas
          - paragraph [ref=f2e38]: Cada saga agrupa un arco de la historia principal. Entra en una para ver sus misiones.
          - button "SAGA 01 Futuro prometedor Formación de Novicio · Tutorial completo de la aldea 0/1 misiones Misiones descubiertas VER MISIONES →" [ref=f2e40]:
            - generic [ref=f2e41]: SAGA 01
            - strong [ref=f2e42]: Futuro prometedor
            - generic [ref=f2e43]: Formación de Novicio · Tutorial completo de la aldea
            - generic [ref=f2e44]:
              - generic [ref=f2e45]: 0/1 misiones
              - generic [ref=f2e46]: Misiones descubiertas
            - generic [ref=f2e47]: VER MISIONES →
        - region "Explicación del maestro y del guardián":
          - generic:
            - img "Ren Arashiro"
          - generic [ref=f2e48]:
            - generic [ref=f2e49]:
              - strong [ref=f2e50]: Ren Arashiro
              - generic [ref=f2e51]: Jefe de la Aldea
              - button "Cerrar explicación" [ref=f2e52]: ×
            - heading "Recibe tu primera misión" [level=3] [ref=f2e53]
            - generic [ref=f2e54]:
              - paragraph [ref=f2e55]: Tu primer encargo es recuperar un gato robado en el Bosque del Este. Abre Futuro prometedor para localizar la misión; antes de salir prepararás tu equipo con tu maestro.
              - status [ref=f2e56]: Usa el control resaltado.
              - status
            - button "Mostrar el control" [ref=f2e58]
```