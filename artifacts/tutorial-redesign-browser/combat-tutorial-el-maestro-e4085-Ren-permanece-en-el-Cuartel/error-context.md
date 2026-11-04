# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-tutorial.spec.mjs >> el maestro acompaña el combate y Ren permanece en el Cuartel
- Location: tests\combat-tutorial.spec.mjs:97:1

# Error details

```
Test timeout of 90000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - region "Juego de combate por turnos" [ref=f1e3]:
    - region "Interfaz de combate":
      - generic:
        - generic:
          - strong: APRENDIZ
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 105/105
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 80/80
        - generic:
          - strong: BANDIDO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 54/54
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 24/24
        - status:
          - strong: EN COMBATE
          - button "Pausar combate (Escape)" [ref=f1e4]: Ⅱ
          - button "Abrir objetos de misión" [disabled] [ref=f1e5]:
            - generic [ref=f1e8]: Objetos
      - generic:
        - generic [aria-hidden]: ELEMENTALES
        - button "Cambiar a habilidades físicas (0)" [disabled] [ref=f1e9]
        - status
      - generic:
        - button "1. Golpe veloz, 0 CH" [disabled] [pressed] [ref=f1e13]:
          - generic [aria-hidden] [ref=f1e14]: "1"
          - generic [ref=f1e17]:
            - generic [ref=f1e18]: Golpe veloz
            - generic [ref=f1e19]: 0 CH
        - button "2. Ascuas veloces, 30 CH" [disabled] [ref=f1e21]:
          - generic [aria-hidden] [ref=f1e22]: "2"
          - generic [ref=f1e25]: 火
          - generic [ref=f1e26]:
            - generic [ref=f1e27]: Ascuas veloces
            - generic [ref=f1e28]: 30 CH
        - button "3. Aliento de brasa, 42 CH" [disabled] [ref=f1e30]:
          - generic [aria-hidden] [ref=f1e31]: "3"
          - generic [ref=f1e34]: 炎
          - generic [ref=f1e35]:
            - generic [ref=f1e36]: Aliento de brasa
            - generic [ref=f1e37]: 42 CH
        - button "4. Ranura sellada, NV 5" [disabled] [ref=f1e39]:
          - generic [aria-hidden] [ref=f1e40]: "4"
          - generic [ref=f1e42]: 封
          - generic [ref=f1e43]:
            - generic [ref=f1e44]: Ranura sellada
            - generic [ref=f1e45]: NV 5
        - button "5. Ranura sellada, NV 8" [disabled] [ref=f1e47]:
          - generic [aria-hidden] [ref=f1e48]: "5"
          - generic [ref=f1e50]: 封
          - generic [ref=f1e51]:
            - generic [ref=f1e52]: Ranura sellada
            - generic [ref=f1e53]: NV 8
        - button "6. Guardia, 0 CH" [disabled] [ref=f1e55]:
          - generic [aria-hidden] [ref=f1e56]: "6"
          - generic [ref=f1e59]:
            - generic [ref=f1e60]: Guardia
            - generic [ref=f1e61]: 0 CH
      - generic:
        - strong: ORDEN DE TURNO · preparación 80–100 %
        - generic:
          - text: Aprendiz
          - progressbar "Aprendiz"
        - generic:
          - text: BANDIDO
          - progressbar "BANDIDO"
      - status
    - generic:
      - generic:
        - generic:
          - img "Mei Hayate"
        - dialog [ref=f1e62]:
          - generic [ref=f1e63]:
            - strong [ref=f1e64]: Mei Hayate
            - generic [ref=f1e65]: Instructora de Técnicas
          - paragraph [ref=f1e66]: PASO 2 DE 14
          - heading "Espera tu turno y elige" [level=2] [ref=f1e67]
          - paragraph [ref=f1e69]: Tu marcador avanza por la barra inferior. Al llegar al 80 %, el combate se detiene para que elijas con calma. El rival tiene su propio marcador. Ahora espera tu primer turno.
          - generic [ref=f1e70]:
            - paragraph [ref=f1e71]: El combate espera mientras lees.
            - button "Continuar" [active] [ref=f1e72]
      - button "Pausar formación" [ref=f1e73]
```