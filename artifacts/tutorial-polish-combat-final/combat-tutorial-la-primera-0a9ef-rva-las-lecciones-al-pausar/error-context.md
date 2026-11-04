# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-tutorial.spec.mjs >> la primera misión exige prácticas reales y conserva las lecciones al pausar
- Location: tests\combat-tutorial.spec.mjs:265:1

# Error details

```
Test timeout of 150000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - region "Juego de combate por turnos" [ref=f1e3]:
    - dialog [ref=f1e5]:
      - generic [ref=f1e6]:
        - text: ◆
        - generic [ref=f1e7]:
          - generic [aria-hidden] [ref=f1e8]: Ⅱ
          - paragraph [ref=f1e9]: CRÓNICAS DEL SELLO
          - heading "MISIÓN EN PAUSA" [level=2] [ref=f1e10]
          - paragraph [ref=f1e11]: El combate continuará donde lo dejaste.
        - generic [ref=f1e12]:
          - generic [ref=f1e13]:
            - heading "COMBATE" [level=3] [ref=f1e14]:
              - generic [aria-hidden] [ref=f1e15]: 一
              - text: COMBATE
            - generic [ref=f1e16]:
              - switch "Sellos manuales" [ref=f1e17]:
                - generic [ref=f1e18]:
                  - strong [ref=f1e19]: Sellos manuales
                  - generic [ref=f1e20]: Completa las secuencias con el teclado.
                - generic [ref=f1e22]: "No"
              - switch "Sacudida de cámara" [ref=f1e24]:
                - generic [ref=f1e25]:
                  - strong [ref=f1e26]: Sacudida de cámara
                  - generic [ref=f1e27]: Movimiento de cámara al recibir impactos.
                - generic [ref=f1e29]: "No"
              - switch "Destellos de pantalla" [ref=f1e31]:
                - generic [ref=f1e32]:
                  - strong [ref=f1e33]: Destellos de pantalla
                  - generic [ref=f1e34]: Resaltan los golpes y las técnicas.
                - generic [ref=f1e36]: "No"
          - generic [ref=f1e38]:
            - heading "IMAGEN Y SONIDO" [level=3] [ref=f1e39]:
              - generic [aria-hidden] [ref=f1e40]: 二
              - text: IMAGEN Y SONIDO
            - generic [ref=f1e42]:
              - generic [ref=f1e43]: Resolución de combate
              - radiogroup "Resolución de combate" [ref=f1e44]:
                - radio "Automática según el equipo" [checked] [ref=f1e45]: Auto
                - radio "Económica · 960 * 540" [ref=f1e46]: 960 * 540
                - radio "Baja · 1200 * 675" [ref=f1e47]: 1200 * 675
                - radio "Media · 1440 * 810" [ref=f1e48]: 1440 * 810
                - radio "Alta · 1920 * 1080" [ref=f1e49]: 1920 * 1080
              - status [ref=f1e50]: "Resolución actual: 960 * 540 px."
            - generic [ref=f1e51]:
              - switch "Modo ligero" [ref=f1e52]:
                - generic [ref=f1e53]:
                  - strong [ref=f1e54]: Modo ligero
                  - generic [ref=f1e55]: Reduce partículas y efectos visuales.
                - generic [ref=f1e57]: "No"
              - switch "Música" [ref=f1e59]:
                - generic [ref=f1e60]:
                  - strong [ref=f1e61]: Música
                  - generic [ref=f1e62]: Acompaña el combate con música ambiental.
                - generic [ref=f1e64]: "No"
            - generic [ref=f1e66]:
              - generic [ref=f1e67]:
                - text: Volumen
                - status "Volumen" [ref=f1e68]: 70%
              - slider "Volumen" [ref=f1e69]: "70"
        - button "MEDIR RENDIMIENTO · FPS" [ref=f1e70]
        - generic [ref=f1e71]:
          - button "REANUDAR" [active] [ref=f1e72]:
            - text: REANUDAR
            - generic [aria-hidden] [ref=f1e73]: Esc
          - button "ABANDONAR" [ref=f1e74]
        - text: ◆
```