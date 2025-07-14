---
title: ¡Mi Biografía!
published: 2025-07-10
description: "Descubre quién soy, los objetivos de este sitio y lo que está por venir."
image: "./cover.png"
tags: ["Biografía"]
category: Lanzamiento oficial
draft: false
---

¡Hola! Soy Kevin Borja y te doy la bienvenida a mi web: **Kevinborja.com**. Este espacio nace de mi pasión por la tecnología, el desarrollo web y la curiosidad constante. Aquí comparto proyectos, experimentos, ideas y recursos. Quiero que este sitio sea un punto de encuentro para quienes buscan aprender, colaborar y crecer.

## ¿Qué podrás encontrar?

<svg width="400" height="190" viewBox="0 0 400 190" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Fondo blanco y borde degradado dorado -->
    <linearGradient id="border-gold-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD700" />
      <stop offset="100%" stop-color="#fff4e0" />
    </linearGradient>
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFD700" />
      <stop offset="60%" stop-color="#00e580" />
      <stop offset="100%" stop-color="#7C5FFF" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Marco dorado degradado -->
  <rect x="3" y="3" width="394" height="184" rx="30" fill="#fff" stroke="url(#border-gold-gradient)" stroke-width="6"/>
  <!-- Glow dorado -->
  <ellipse cx="200" cy="90" rx="145" ry="70" fill="url(#glow)" />
  <!-- Robot/diadema centrado estilo minimalista y compatible -->
  <g class="headphone-emoji">
    <circle cx="200" cy="28" r="18" fill="#fff"/>
    <!-- Diadema superior -->
    <rect x="184" y="15" width="32" height="9" rx="4.5" fill="#7c5fff"/>
    <!-- Franja dorada superior -->
    <rect x="190" y="11" width="20" height="4" rx="2" fill="#FFD700"/>
    <!-- Auriculares laterales -->
    <rect x="187" y="28" width="7" height="7" rx="3.5" fill="#00e580"/>
    <rect x="206" y="28" width="7" height="7" rx="3.5" fill="#00e580"/>
    <!-- Ojos robot -->
    <circle cx="194" cy="31" r="2.5" fill="#22223b"/>
    <circle cx="206" cy="31" r="2.5" fill="#22223b"/>
    <!-- Boca robot sonriente -->
    <rect x="196" y="37" width="8" height="2.5" rx="1" fill="#FFD700"/>
  </g>
  <!-- Título central -->
  <text x="200" y="58" text-anchor="middle" fill="#FFD700" font-size="28" font-family="monospace" font-weight="bold">
    🎧 Música, Videos, Podcasts
  </text>
  <!-- Slogan -->
  <text x="200" y="82" text-anchor="middle" fill="#00e580" font-size="20" font-family="monospace" font-weight="bold">
    Descubre, aprende y sonríe
  </text>
  <!-- Innovador y chill -->
  <text x="200" y="106" text-anchor="middle" fill="#7C5FFF" font-size="18" font-family="monospace">
    🚀 Innovador & chill
  </text>
  <!-- Temáticas -->
  <text x="200" y="130" text-anchor="middle" fill="#FFD700" font-size="17" font-family="monospace">
    🎨  |  🎵  |  🤓  |  🎬  |  🌈
  </text>
  <!-- Frase final -->
  <text x="200" y="152" text-anchor="middle" fill="#00e580" font-size="16" font-family="monospace">
    Relájate y disfruta contenido único
  </text>
  <!-- Onda animada con CSS -->
  <path id="wavePath" class="wave-anim" d="M0,175 Q100,160 200,175 T400,175" fill="none" stroke="url(#wave)" stroke-width="6"/>
  <!-- Esferas animadas con CSS -->
  <circle class="ball-anim-left" cx="70" cy="170" r="9" fill="#FFD700" opacity="0.85"/>
  <circle class="ball-anim-right" cx="330" cy="170" r="9" fill="#00e580" opacity="0.85"/>
  <!-- Cohete animado en la esquina derecha, estilizado -->
  <g class="rocket-anim">
    <!-- Estela -->
    <rect x="370" y="155" width="5" height="23" rx="2.5" fill="url(#border-gold-gradient)" opacity="0.75"/>
    <rect x="372.5" y="170" width="3" height="10" rx="1.5" fill="#7c5fff" opacity="0.5"/>
    <!-- Cuerpo principal con degradado blanco-dorado -->
    <linearGradient id="rocket-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff4e0"/>
      <stop offset="100%" stop-color="#FFD700"/>
    </linearGradient>
    <rect x="366" y="131" width="12" height="21" rx="6" fill="url(#rocket-body)" stroke="#FFD700" stroke-width="1"/>
    <!-- Punta dorada con brillo -->
    <polygon points="372,126 378,126 375,116" fill="#FFD700" stroke="#fffbe0" stroke-width="1"/>
    <!-- Ventana -->
    <circle cx="372" cy="138" r="3.3" fill="#00e580" stroke="#FFD700" stroke-width="1"/>
    <!-- Base -->
    <rect x="369" y="151" width="6" height="6" rx="3" fill="#22223b"/>
    <!-- Llama con gradiente -->
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#00e580"/>
    </linearGradient>
    <polygon points="368,157 376,157 372,167" fill="url(#flame)"/>
    <!-- Detalles extra para estilizar -->
    <ellipse cx="372" cy="133" rx="2.1" ry="1.1" fill="#fff" opacity="0.5"/>
    <ellipse cx="370" cy="143" rx="1" ry="0.5" fill="#fff" opacity="0.3"/>
  </g>
</svg>
<style>
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 2.8s infinite;
  transform-origin: center;
}
@keyframes waveBounce {
  0% { transform: translateY(0px);}
  20% { transform: translateY(-7px);}
  40% { transform: translateY(6px);}
  60% { transform: translateY(-4px);}
  80% { transform: translateY(2px);}
  100% { transform: translateY(0px);}
}
.ball-anim-left {
  animation: ballUpDown 2s infinite;
}
.ball-anim-right {
  animation: ballUpDown 2s infinite 1s;
}
@keyframes ballUpDown {
  0% { transform: translateY(0);}
  20% { transform: translateY(-18px);}
  40% { transform: translateY(0);}
  60% { transform: translateY(8px);}
  80% { transform: translateY(0);}
  100% { transform: translateY(0);}
}
.headphone-emoji {
  animation: headphonesPulse 2.5s infinite alternate;
}
@keyframes headphonesPulse {
  0% { filter: drop-shadow(0 0 0px #FFD700);}
  80% { filter: drop-shadow(0 0 10px #FFD700);}
  100% { filter: drop-shadow(0 0 0px #FFD700);}
}
.rocket-anim {
  animation: rocketUp 2.9s infinite cubic-bezier(.7,.2,.2,.8);
}
@keyframes rocketUp {
  0%   { transform: translateY(0);}
  14%  { transform: translateY(-14px);}
  28%  { transform: translateY(-20px);}
  50%  { transform: translateY(-10px);}
  72%  { transform: translateY(0);}
  80%  { transform: translateY(8px);}
  100% { transform: translateY(0);}
}
</style>

- Contenido entretenido y educativo.
- Herramientas prácticas y guías útiles.
- Un blog interactivo con tutoriales, reflexiones y experiencias en desarrollo web, tecnología y temas afines.
- Espacios para la participación y el intercambio de ideas.

## Próximas funcionalidades
---

```yaml
Actualmente trabajo en nuevas mejoras, que incluirán:
- Integración de contenido multimedia (videos, podcasts, etc).
- Sección de comentarios y contacto directo.
- Incorporación de tecnologías emergentes.
- Recursos exclusivos para la comunidad.
```

## Mi visión
---

> Deseo que **Kevinborja.com** sea una web viva, en constante evolución. Lo que ves ahora es solo el comienzo: mi meta es seguir sumando valor, creciendo y ofreciendo contenido relevante para ti.

Espero que disfrutes la experiencia y te sumes a esta aventura. ¡Gracias por tu visita y bienvenido/a!
