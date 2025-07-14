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

- Contenido entretenido y educativo.
  <div class="banner-mibio">
  <svg width="400" height="210" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f6f8fa" />
        <stop offset="100%" stop-color="#c7d2fe" />
      </linearGradient>
      <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7c5fff" />
        <stop offset="40%" stop-color="#00e580" />
        <stop offset="100%" stop-color="#0090ff" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="35%" r="85%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#c7d2fe" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Fondo y glow -->
    <rect width="400" height="210" rx="32" fill="url(#bg)" />
    <ellipse cx="200" cy="90" rx="145" ry="70" fill="url(#glow)" />

    <!-- Emoji diadema SVG, central y claro -->
    <g class="headphone-emoji" style="transform:translate(170px,22px) scale(2.5)">
      <circle cx="20" cy="20" r="16" fill="#fff"/>
      <rect x="6" y="14" width="28" height="10" rx="5" fill="#7c5fff"/>
      <rect x="11" y="10" width="18" height="4.5" rx="2" fill="#00e580"/>
      <rect x="8" y="20" width="7" height="7" rx="3.5" fill="#0090ff"/>
      <rect x="25" y="20" width="7" height="7" rx="3.5" fill="#0090ff"/>
    </g>

    <!-- Título central -->
    <text x="200" y="73" text-anchor="middle" fill="#22223b" font-size="26" font-family="monospace" font-weight="bold">
      Música, Videos y Podcasts
    </text>
    <!-- Slogan -->
    <text x="200" y="98" text-anchor="middle" fill="#0090ff" font-size="20" font-family="monospace" font-weight="bold">
      Descubre, aprende y sonríe
    </text>
    <!-- Innovador y chill -->
    <text x="200" y="119" text-anchor="middle" fill="#00e580" font-size="17" font-family="monospace">
      🚀 Innovador & chill
    </text>
    <!-- Temáticas -->
    <text x="200" y="142" text-anchor="middle" fill="#7c5fff" font-size="16" font-family="monospace">
      🎨  |  🎵  |  🤓  |  🎬  |  🌈
    </text>
    <!-- Frase final -->
    <text x="200" y="162" text-anchor="middle" fill="#22223b" font-size="15" font-family="monospace">
      Relájate y disfruta contenido único
    </text>
    <!-- Onda animada -->
    <path id="wavePath" class="wave-anim" d="M0,180 Q100,165 200,180 T400,180" fill="none" stroke="url(#wave)" stroke-width="7"/>
    <!-- Cohete animado con estela -->
    <g class="rocket-anim">
      <!-- Estela -->
      <rect x="197" y="172" width="6" height="26" rx="3" fill="#00e580" opacity="0.7"/>
      <rect x="198" y="190" width="4" height="12" rx="2" fill="#7c5fff" opacity="0.5"/>
      <!-- Cuerpo -->
      <rect x="192" y="146" width="16" height="29" rx="8" fill="#fff"/>
      <polygon points="200,144 208,144 204,132" fill="#0090ff"/>
      <rect x="196" y="175" width="8" height="8" rx="4" fill="#22223b"/>
      <polygon points="194,183 206,183 200,196" fill="#00e580"/>
      <!-- Ventana -->
      <circle cx="200" cy="160" r="4" fill="#0090ff"/>
    </g>
  </svg>
</div>

<style>
.banner-mibio {
  background: linear-gradient(135deg,#f6f8fa 0%, #c7d2fe 100%);
  border-radius: 32px;
  overflow: hidden;
  width: 400px;
  margin: auto;
  box-shadow: 0 8px 32px #0090ff44;
  position: relative;
  padding-bottom: 2px;
}

/* Onda animada */
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 2.8s infinite;
}
@keyframes waveBounce {
  0% { transform: translateY(0px);}
  18% { transform: translateY(-10px);}
  40% { transform: translateY(7px);}
  60% { transform: translateY(-4px);}
  80% { transform: translateY(2px);}
  100% { transform: translateY(0px);}
}

/* Diadema animada */
.headphone-emoji {
  animation: headphonesPulse 2.5s infinite alternate;
}
@keyframes headphonesPulse {
  0% { filter: drop-shadow(0 0 0px #00e580);}
  80% { filter: drop-shadow(0 0 14px #0090ff);}
  100% { filter: drop-shadow(0 0 0px #00e580);}
}

/* Cohete animado con estela */
.rocket-anim {
  animation: rocketUp 2.9s infinite cubic-bezier(.7,.2,.2,.8);
}
@keyframes rocketUp {
  0%   { transform: translateY(0);}
  14%  { transform: translateY(-20px);}
  28%  { transform: translateY(-38px);}
  50%  { transform: translateY(-18px);}
  72%  { transform: translateY(0);}
  80%  { transform: translateY(10px);}
  100% { transform: translateY(0);}
}
</style>
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
