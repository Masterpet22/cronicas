# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: story-discovery.spec.mjs >> Kagemori se inicia y completa como principal desde el Cuartel
- Location: tests\story-discovery.spec.mjs:37:1

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
      - button "Abrir herramientas de pruebas" [ref=f1e5]:
        - generic [ref=f1e6]: DEV
        - text: PRUEBAS
      - button "Pausar misión" [ref=f1e7]:
        - generic [ref=f1e10]: Pausa
      - region "Aldea de Kagemori" [ref=f1e11]
      - complementary "Guía de formación de la saga 1" [ref=f1e12]:
        - generic [ref=f1e13]:
          - strong [ref=f1e14]: SAGA 1 · FORMACIÓN
          - button "Reducir guía" [ref=f1e15]: −
        - generic [ref=f1e16]:
          - text: Preparación e investigación
          - heading "Práctica en misión" [level=3] [ref=f1e17]
          - paragraph [ref=f1e18]: Preparación completada. Vuelve al Cuartel para iniciar la práctica de esta misión.
          - button "Volver al Cuartel" [ref=f1e19]
          - status
    - generic [ref=f1e20]:
      - generic:
        - img "Iori Kagemori"
        - generic: Iori Kagemori
      - generic [ref=f1e21]:
        - generic [ref=f1e22]: Iori Kagemori · Anciano de Kagemori
        - paragraph [ref=f1e23]: "Las tres señales coinciden. No vinieron a saquear al azar: reunieron comida, herramientas y mapas para abastecer un campamento."
        - generic [ref=f1e24]:
          - generic [ref=f1e25]: 1/3
          - button "SIGUIENTE" [ref=f1e27]
```