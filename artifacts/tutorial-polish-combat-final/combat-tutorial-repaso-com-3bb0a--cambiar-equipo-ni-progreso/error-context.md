# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-tutorial.spec.mjs >> repaso completo actualizado, sellos manuales, sin cambiar equipo ni progreso
- Location: tests\combat-tutorial.spec.mjs:285:37

# Error details

```
Test timeout of 150000ms exceeded.
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
            - heading "Aprendiz" [level=2] [ref=f1e10]
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
      - region "Biblioteca" [ref=f1e30]:
        - button "Hablar con Sayo Kisaragi" [ref=f1e31]:
          - img "Sayo Kisaragi" [ref=f1e32]
          - generic [ref=f1e33]: Sayo Kisaragi
        - status:
          - strong: Sayo Kisaragi · Archivera Mayor
          - generic: Las páginas esperan con más paciencia que nosotros.
        - region "Biblioteca" [ref=f1e35]:
          - generic [ref=f1e36]:
            - generic [ref=f1e37]:
              - paragraph [ref=f1e38]: BIBLIOTECA
              - heading "El conocimiento de la aldea" [level=2] [ref=f1e39]
            - generic [ref=f1e40]: Archivo de Sayo
          - complementary "Entrega pendiente" [ref=f1e41]:
            - generic [ref=f1e42]:
              - strong [ref=f1e43]: El libro de Haru Takamine
              - paragraph [ref=f1e44]: Entrega el libro a Sayo para activar el bestiario y continuar la historia.
            - button "ENTREGAR LIBRO" [ref=f1e45]
          - tablist "Secciones de la Biblioteca" [ref=f1e46]:
            - tab "Diccionario" [ref=f1e47]
            - tab "Tutorial" [selected] [ref=f1e48]
            - tab "Bestiario Pendiente" [ref=f1e49]:
              - text: Bestiario
              - generic [ref=f1e50]: Pendiente
            - tab "Crónica Pendiente" [ref=f1e51]:
              - text: Crónica
              - generic [ref=f1e52]: Pendiente
          - tabpanel "Tutorial" [ref=f1e54]:
            - generic "Formación de Novicio" [ref=f1e55]:
              - generic [ref=f1e56]:
                - paragraph [ref=f1e57]: MANUAL DEL COMBATIENTE
                - heading "Saga 1 · Formación de Novicio" [level=3] [ref=f1e58]
                - paragraph [ref=f1e59]: Las siete misiones enseñan combate, preparación, investigación, rutas, información, estados y decisiones. La guía de cada misión acredita acciones realizadas.
                - paragraph [ref=f1e60]: Repite el primer módulo con vida, chakra, ritmo, golpe, Guardia, arma, shuriken, tablas, técnicas, sellos y pausa. El repaso no cambia tu partida y permite salir en cualquier momento.
                - button "REPETIR TUTORIAL GUIADO" [ref=f1e61]
                - group [ref=f1e62]:
                  - generic "1. Primer combate Completado" [ref=f1e63]:
                    - text: 1. Primer combate
                    - generic [ref=f1e64]: Completado
                - group [ref=f1e65]:
                  - generic "2. Preparación e investigación 0/13 prácticas" [ref=f1e66]:
                    - text: 2. Preparación e investigación
                    - generic [ref=f1e67]: 0/13 prácticas
                - group [ref=f1e68]:
                  - generic "3. Recursos y decisiones 0/6 prácticas" [ref=f1e69]:
                    - text: 3. Recursos y decisiones
                    - generic [ref=f1e70]: 0/6 prácticas
                - group [ref=f1e71]:
                  - generic "4. Rutas y descifrado 0/5 prácticas" [ref=f1e72]:
                    - text: 4. Rutas y descifrado
                    - generic [ref=f1e73]: 0/5 prácticas
                - group [ref=f1e74]:
                  - generic "5. Información y táctica 0/7 prácticas" [ref=f1e75]:
                    - text: 5. Información y táctica
                    - generic [ref=f1e76]: 0/7 prácticas
                - group [ref=f1e77]:
                  - generic "6. Estados y suministros 0/5 prácticas" [ref=f1e78]:
                    - text: 6. Estados y suministros
                    - generic [ref=f1e79]: 0/5 prácticas
                - group [ref=f1e80]:
                  - generic "7. Evaluación de la formación 0/6 prácticas" [ref=f1e81]:
                    - text: 7. Evaluación de la formación
                    - generic [ref=f1e82]: 0/6 prácticas
```