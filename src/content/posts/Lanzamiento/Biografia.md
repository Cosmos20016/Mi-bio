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

<svg width="400" height="210" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg">
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
    <!-- Glow radial dorado -->
    <radialGradient id="glow" cx="50%" cy="35%" r="85%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.23"/>
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
  <!-- Fondo y glow -->
  <rect width="400" height="210" rx="32" fill="url(#bg)" />
  <ellipse cx="200" cy="90" rx="145" ry="70" fill="url(#glow)" />

  <!-- Robot/diadema perfectamente centrado -->
  <g class="headphone-emoji">
    <!-- Cara -->
    <circle cx="200" cy="50" r="36" fill="#fff"/>
    <!-- Diadema superior -->
    <rect x="164" y="31" width="72" height="22" rx="11" fill="#7c5fff"/>
    <!-- Franja dorada superior -->
    <rect x="178" y="26" width="44" height="8" rx="4" fill="#FFD700"/>
    <!-- Auriculares laterales -->
    <rect x="170" y="62" width="14" height="14" rx="7" fill="#00e580"/>
    <rect x="216" y="62" width="14" height="14" rx="7" fill="#00e580"/>
    <!-- Ojos robot -->
    <circle cx="190" cy="58" r="5" fill="#22223b"/>
    <circle cx="210" cy="58" r="5" fill="#22223b"/>
    <!-- Boca robot sonriente -->
    <rect x="191" y="71" width="18" height="4" rx="2" fill="#FFD700"/>
  </g>

  <!-- Título central -->
  <text x="200" y="105" text-anchor="middle" fill="#22223b" font-size="26" font-family="monospace" font-weight="bold">
    Música, Videos y Podcasts
  </text>
  <!-- Slogan -->
  <text x="200" y="130" text-anchor="middle" fill="#FFD700" font-size="20" font-family="monospace" font-weight="bold">
    Descubre, aprende y sonríe
  </text>
  <!-- Innovador y chill -->
  <text x="200" y="148" text-anchor="middle" fill="#00e580" font-size="17" font-family="monospace">
    🚀 Innovador & chill
  </text>
  <!-- Temáticas -->
  <text x="200" y="166" text-anchor="middle" fill="#7c5fff" font-size="16" font-family="monospace">
    🎨  |  🎵  |  🤓  |  🎬  |  🌈
  </text>
  <!-- Frase final -->
  <text x="200" y="190" text-anchor="middle" fill="#22223b" font-size="15" font-family="monospace">
    Relájate y disfruta contenido único
  </text>
  <!-- Onda animada -->
  <path class="wave-anim" d="M0,200 Q100,185 200,200 T400,200" fill="none" stroke="url(#wave)" stroke-width="7"/>
  
  <!-- Cohete estilizado con degradados en la esquina derecha y animación -->
  <g class="rocket-anim">
    <!-- Estela -->
    <rect x="375" y="162" width="6" height="26" rx="3" fill="url(#rocket-border)" opacity="0.7"/>
    <rect x="377" y="180" width="4" height="12" rx="2" fill="#7c5fff" opacity="0.5"/>
    <!-- Cuerpo principal con degradado -->
    <rect x="370" y="138" width="16" height="29" rx="8" fill="url(#rocket-body)" stroke="url(#rocket-border)" stroke-width="2"/>
    <!-- Punta dorada con brillo -->
    <polygon points="378,136 386,136 382,122" fill="#FFD700" stroke="#fff4e0" stroke-width="1"/>
    <!-- Ventana -->
    <circle cx="378" cy="152" r="4" fill="#00e580" stroke="#FFD700" stroke-width="1"/>
    <!-- Base -->
    <rect x="374" y="167" width="8" height="8" rx="4" fill="#22223b"/>
    <!-- Llama con gradiente -->
    <polygon points="372,175 384,175 378,193" fill="url(#flame)"/>
    <!-- Detalles brillantes -->
    <ellipse cx="378" cy="144" rx="2.2" ry="1.1" fill="#fff" opacity="0.5"/>
    <ellipse cx="374" cy="160" rx="1.2" ry="0.6" fill="#fff" opacity="0.3"/>
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
</style>

---
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
