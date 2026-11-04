# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tutorial-polish.spec.mjs >> la ayuda de daichi se integra con Ren y se puede cerrar
- Location: tests\tutorial-polish.spec.mjs:78:75

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - generic "Controles generales":
    - generic:
      - paragraph: RPG 2D POR TURNOS
      - heading "Crónicas del Sello" [level=1]
    - group:
      - generic "Ajustes":
        - generic [aria-hidden]: ⚙
        - text: Ajustes
  - region "Dojo y progreso del personaje" [ref=f1e3]:
    - generic [ref=f1e4]:
      - generic [ref=f1e5]:
        - generic [ref=f1e6]:
          - generic [ref=f1e8]:
            - paragraph [ref=f1e9]: RANGO 1 · NOVICIO
            - heading "Akio" [level=2] [ref=f1e10]
          - generic "Nivel 1" [ref=f1e11]:
            - generic [ref=f1e12]: NIVEL
            - strong [ref=f1e13]: "1"
        - generic "Progreso de la partida" [ref=f1e14]:
          - generic "0 de 120 puntos de experiencia" [ref=f1e15]:
            - strong [ref=f1e17]: 0/120
            - generic [ref=f1e18]: PX
          - generic "0 monedas" [ref=f1e19]:
            - strong [ref=f1e21]: "0"
            - generic [ref=f1e22]: monedas
        - generic "Acciones de la partida" [ref=f1e23]:
          - button "Abrir ajustes" [ref=f1e24]
      - button "Abrir herramientas de pruebas" [ref=f1e25]:
        - generic [ref=f1e26]: DEV
        - text: PRUEBAS
      - navigation "Navegación de la aldea" [ref=f1e27]:
        - button "← Volver al mapa" [ref=f1e28]
        - button "Pedir ayuda al maestro" [ref=f1e29]
      - region "Cuartel General" [ref=f1e30]:
        - button "Hablar con Ren Arashiro" [ref=f1e31]:
          - img "Ren Arashiro" [ref=f1e32]
          - generic [ref=f1e33]: Ren Arashiro
        - status:
          - region "Explicación del maestro y del guardián":
            - button "Cerrar explicación": ×
            - generic:
              - generic:
                - generic:
                  - strong: Ren Arashiro
                  - generic: Jefe de la Aldea
              - generic:
                - generic:
                  - strong: Daichi Kazan
                  - generic: Tu maestro
            - paragraph: "Ren Arashiro: Yo organizo las sagas y sus encargos. Tu maestro te ayudará a preparar cada salida."
            - heading "Recibe tu primera misión" [level=3]
            - paragraph: El Cuartel General contiene las sagas y sus misiones principales. Abre Futuro prometedor.
            - status: Usa el control resaltado.
            - button "Mostrar el control"
            - status
        - generic [ref=f1e35]:
          - generic [ref=f1e36]:
            - generic [ref=f1e37]:
              - paragraph [ref=f1e38]: CENTRO DE MANDO
              - heading "Selecciona una saga" [level=2] [ref=f1e39]
            - strong [ref=f1e40]: 0/1 completadas
          - paragraph [ref=f1e41]: Cada saga agrupa un arco de la historia principal. Entra en una para ver sus misiones.
          - button "SAGA 01 Futuro prometedor Formación de Novicio · Tutorial completo de la aldea 0/1 misiones Misiones descubiertas VER MISIONES →" [ref=f1e43]:
            - generic [ref=f1e44]: SAGA 01
            - strong [ref=f1e45]: Futuro prometedor
            - generic [ref=f1e46]: Formación de Novicio · Tutorial completo de la aldea
            - generic [ref=f1e47]:
              - generic [ref=f1e48]: 0/1 misiones
              - generic [ref=f1e49]: Misiones descubiertas
            - generic [ref=f1e50]: VER MISIONES →
```