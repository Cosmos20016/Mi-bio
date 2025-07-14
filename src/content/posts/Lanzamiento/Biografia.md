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
---
<style>
.center-svg {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 55vh; /* Más corto verticalmente, sin reducir tamaño SVG */
  width: 100%;
  padding: 0 10px;
  box-sizing: border-box;
}
.svg-responsive {
  width: 100%;
  max-width: 400px;
  height: auto;
  display: block;
}
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 3.388s infinite; /* 10% más lento */
  transform-origin: center;
}
@keyframes waveBounce {
  0% { transform: translateY(0px);}
  18% { transform: translateY(-10px);}
  40% { transform: translateY(7px);}
  60% { transform: translateY(-4px);}
  80% { transform: translateY(2px);}
  100% { transform: translateY(0px);}
}
.headphone-emoji {
  animation: headphonesPulse 2.5s infinite alternate;
}
@keyframes headphonesPulse {
  0% { filter: drop-shadow(0 0 0px #FFD700);}
  80% { filter: drop-shadow(0 0 14px #FFD700);}
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
/* Animación ignición llama cohete con más vida y sincronizada */
.flame-anim {
  transform-origin: 378px 159px;
  animation: flameIgnite 2.9s infinite cubic-bezier(.7,.2,.2,.8);
}
@keyframes flameIgnite {
  /* simulando explosión, vibración y estiramiento de llama */
  0%   { opacity: 0.7; transform: scaleY(1) scaleX(1);}
  8%   { opacity: 1;   transform: scaleY(1.6) scaleX(0.9) skewY(-6deg);}
  16%  { opacity: 0.9;   transform: scaleY(1.1) scaleX(1.1) skewY(8deg);}
  32%  { opacity: 1;   transform: scaleY(1.8) scaleX(0.8) skewY(-10deg);}
  48%  { opacity: 0.85;   transform: scaleY(1) scaleX(1.05) skewY(5deg);}
  64%  { opacity: 1;   transform: scaleY(1.35) scaleX(0.95) skewY(-4deg);}
  80%  { opacity: 0.85;   transform: scaleY(1) scaleX(1.07) skewY(2deg);}
  100% { opacity: 0.7; transform: scaleY(1) scaleX(1);}
}
</style>

<div class="center-svg">
<svg class="svg-responsive" width="400" height="180" viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Fondo degradado blanco-dorado -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f6f8fa" />
      <stop offset="100%" stop-color="#fff4e0" />
    </linearGradient>
    <!-- Degradado multicolor para la onda -->
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c5fff" />
      <stop offset="40%" stop-color="#00e580" />
      <stop offset="100%" stop-color="#FFD700" />
    </linearGradient>
    <!-- Glow radial dorado para los bordes -->
    <radialGradient id="glow-borders" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.0"/>
      <stop offset="68%" stop-color="#FFD700" stop-opacity="0.12"/>
      <stop offset="98%" stop-color="#FFD700" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#fff4e0" stop-opacity="0"/>
    </radialGradient>
    <!-- Glow radial dorado robot -->
    <radialGradient id="glow-robot" cx="50%" cy="50%" r="85%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.33"/>
      <stop offset="100%" stop-color="#fff4e0" stop-opacity="0"/>
    </radialGradient>
    <!-- Degradado dorado para borde del cohete -->
    <linearGradient id="rocket-border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#fff4e0"/>
    </linearGradient>
    <!-- Degradado para cuerpo del cohete -->
    <linearGradient id="rocket-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#fff4e0"/>
    </linearGradient>
    <!-- Degradado para la llama -->
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#00e580"/>
    </linearGradient>
  </defs>
  <!-- Glow dorado animado por los bordes (elipse más grande) -->
  <ellipse class="glow-anim-borders" cx="200" cy="90" rx="196" ry="82" fill="url(#glow-borders)" />
  <!-- Fondo blanco degradado -->
  <rect width="400" height="180" rx="32" fill="url(#bg)" />
  <!-- Glow dorado detrás del robot -->
  <ellipse class="glow-anim-robot" cx="200" cy="46" rx="45" ry="22" fill="url(#glow-robot)" />
  <!-- Robot/diadema perfectamente centrado -->
  <g class="headphone-emoji">
    <circle cx="200" cy="46" r="36" fill="#fff"/>
    <rect x="164" y="27" width="72" height="22" rx="11" fill="#7c5fff"/>
    <rect x="178" y="22" width="44" height="8" rx="4" fill="#FFD700"/>
    <rect x="170" y="58" width="14" height="14" rx="7" fill="#00e580"/>
    <rect x="216" y="58" width="14" height="14" rx="7" fill="#00e580"/>
    <circle cx="190" cy="54" r="5" fill="#22223b"/>
    <circle cx="210" cy="54" r="5" fill="#22223b"/>
    <rect x="191" y="67" width="18" height="4" rx="2" fill="#FFD700"/>
  </g>
  <!-- Título central -->
  <text x="200" y="90" text-anchor="middle" fill="#22223b" font-size="26" font-family="monospace" font-weight="bold">
    Música, Videos y Podcasts
  </text>
  <text x="200" y="115" text-anchor="middle" fill="#FFD700" font-size="20" font-family="monospace" font-weight="bold">
    Descubre, aprende y sonríe
  </text>
  <text x="200" y="133" text-anchor="middle" fill="#00e580" font-size="17" font-family="monospace">
    🚀 Innovador & chill
  </text>
  <text x="200" y="148" text-anchor="middle" fill="#7c5fff" font-size="16" font-family="monospace">
    🎨  |  🎵  |  🤓  |  🎬  
  </text>
  <text x="200" y="164" text-anchor="middle" fill="#22223b" font-size="15" font-family="monospace">
    Relájate y disfruta contenido único
  </text>
  <!-- Onda animada (más lenta) -->
  <path class="wave-anim" d="M0,170 Q100,155 200,170 T400,170" fill="none" stroke="url(#wave)" stroke-width="7"/>
  <!-- Cohete con animación de ignición en la llama -->
  <g class="rocket-anim">
    <rect x="375" y="142" width="6" height="22" rx="3" fill="url(#rocket-border)" opacity="0.7"/>
    <rect x="377" y="155" width="4" height="10" rx="2" fill="#7c5fff" opacity="0.5"/>
    <rect x="370" y="120" width="16" height="25" rx="8" fill="url(#rocket-body)" stroke="url(#rocket-border)" stroke-width="2"/>
    <polygon points="378,118 386,118 382,106" fill="#FFD700" stroke="#fff4e0" stroke-width="1"/>
    <circle cx="378" cy="132" r="4" fill="#00e580" stroke="#FFD700" stroke-width="1"/>
    <rect x="374" y="143" width="8" height="8" rx="4" fill="#22223b"/>
    <!-- Llama animada con más vida y estilizada -->
    <polygon class="flame-anim" points="372,150 384,150 378,168" fill="url(#flame)"/>
    <!-- Añade una chispa debajo de la llama para dar más realismo -->
    <ellipse class="flame-anim" cx="378" cy="171" rx="2.2" ry="0.8" fill="#FFD700" opacity="0.7"/>
    <ellipse cx="378" cy="126" rx="2.2" ry="1.1" fill="#fff" opacity="0.5"/>
    <ellipse cx="374" cy="139" rx="1.2" ry="0.6" fill="#fff" opacity="0.3"/>
  </g>
</svg>
</div>

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
