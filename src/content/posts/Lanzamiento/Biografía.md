---
title: ¡Mi Biografía!
published: 2025-07-26
description: "Descubre quién soy, los objetivos de este sitio y lo que está por venir."
image: "./cover.png"
tags: ["Biografía"]
category: Lanzamiento oficial
draft: false
---

¡Hola! Soy Kevin Borja, y te doy la bienvenida a mi sitio web: Kevinborja.com. Este espacio surge de mi entusiasmo por la tecnología y el desarrollo web, acompañado de una curiosidad que nunca termina. Aquí encontrarás proyectos, experimentos, ideas y recursos que comparto con la intención de aportar y conectar con personas como tú.

## ¿Qué encontrarás aquí?
---

<style>
.atom-svg {
  display: block;
  margin: 0 auto;
  width: 340px;
  max-width: 98vw;
  height: 340px;
}
@keyframes electron-ellipse1 {
  to   { transform: rotate(360deg);}
}
@keyframes electron-ellipse2 {
  to   { transform: rotate(360deg);}
}
@keyframes electron-ellipse3 {
  to   { transform: rotate(360deg);}
}
@keyframes nucleus-pulse {
  0%,100% { filter: drop-shadow(0 0 10px #65e3ff);}
  50%     { filter: drop-shadow(0 0 22px #9d7bff);}
}
.nucleus-anim {
  animation: nucleus-pulse 2.8s infinite;
}
.electron1 {
  animation: electron-ellipse1 6s linear infinite;
  transform-box: fill-box;
  transform-origin: 170px 170px;
}
.electron2 {
  animation: electron-ellipse2 8s linear infinite;
  transform-box: fill-box;
  transform-origin: 170px 170px;
}
.electron3 {
  animation: electron-ellipse3 10s linear infinite;
  transform-box: fill-box;
  transform-origin: 170px 170px;
}
</style>

<svg class="atom-svg" viewBox="0 0 340 340" xmlns="http://www.w3.org/2000/svg" aria-label="Átomo con electrones siguiendo órbitas elípticas cerca del núcleo">
  <defs>
    <radialGradient id="nucleus-gradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#65e3ff"/>
      <stop offset="60%" stop-color="#9d7bff"/>
      <stop offset="100%" stop-color="#ff6ec7"/>
    </radialGradient>
    <linearGradient id="orbit-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#65e3ff" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#9d7bff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ff6ec7" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <!-- Órbitas más cerca del núcleo -->
  <ellipse cx="170" cy="170" rx="65" ry="22" fill="none" stroke="url(#orbit-gradient)" stroke-width="3"/>
  <ellipse cx="170" cy="170" rx="22" ry="65" fill="none" stroke="url(#orbit-gradient)" stroke-width="3"/>
  <ellipse transform="rotate(60 170 170)" cx="170" cy="170" rx="65" ry="22" fill="none" stroke="url(#orbit-gradient)" stroke-width="3"/>
  <!-- Núcleo animado -->
  <circle class="nucleus-anim" cx="170" cy="170" r="30" fill="url(#nucleus-gradient)" />
  <!-- Electrones sobre cada órbita (borde exacto de la elipse) -->
  <!-- Órbita horizontal -->
  <g class="electron1">
    <circle cx="235" cy="170" r="9" fill="#65e3ff" stroke="#fff" stroke-width="2"/>
  </g>
  <!-- Órbita vertical -->
  <g class="electron2">
    <circle cx="170" cy="105" r="9" fill="#9d7bff" stroke="#fff" stroke-width="2"/>
  </g>
  <!-- Órbita inclinada -->
  <g class="electron3" style="transform: rotate(60deg); animation: electron-ellipse3 10s linear infinite;">
    <circle cx="235" cy="170" r="9" fill="#ff6ec7" stroke="#fff" stroke-width="2"/>
  </g>
  <!-- Sombra y profundidad -->
  <ellipse cx="170" cy="260" rx="30" ry="9" fill="#22223b" opacity="0.13"/>
</svg>

- Contenido educativo y entretenido pensado para inspirar y facilitar el aprendizaje.
- Herramientas prácticas y guías útiles.
- Un blog interactivo con tutoriales, reflexiones y experiencias, tecnología y temas afines.
- Espacios abiertos para participar, compartir y debatir ideas.

## Próximas novedades
---
Actualmente estoy trabajando en nuevas funcionalidades que pronto estarán disponibles:

```yaml
- Integración de contenido multimedia (videos, podcasts, etc).
- Sección de comentarios y contacto directo.
- Recursos exclusivos para la comunidad.
```

## Mi visión
---

> "Quiero que Kevinborja.com sea un espacio dinámico, en constante evolución. Lo que ves ahora es solo el inicio; mi objetivo es continuar creciendo, aportando valor y creando contenido relevante."

<style>
.center-svg {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 54vh;
  width: 100%;
  padding: 0 10px;
  box-sizing: border-box;
}
.svg-responsive {
  width: 100%;
  max-width: 400px;
  height: auto;
  display: block;
  max-width: 100vw;
  max-height: 98vh;
}
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 4.47s infinite;
  transform-origin: center;
  animation-timing-function: cubic-bezier(.6,.2,.2,.8);
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
/* Animación ignición llama cohete sincronizada y estilizada */
.flame-anim {
  transform-origin: 378px 193px;
  animation: flameIgnite 2.9s infinite cubic-bezier(.7,.2,.2,.8);
}
@keyframes flameIgnite {
  0%   { opacity: 0.8; transform: scaleY(1) scaleX(1);}
  14%  { opacity: 1;   transform: scaleY(1.18) scaleX(0.97);}
  28%  { opacity: 0.92;   transform: scaleY(0.97) scaleX(1.11);}
  50%  { opacity: 1;   transform: scaleY(1.2) scaleX(0.93);}
  72%  { opacity: 0.92;   transform: scaleY(1.08) scaleX(1.07);}
  80%  { opacity: 1;   transform: scaleY(1.14) scaleX(0.96);}
  100% { opacity: 0.8; transform: scaleY(1) scaleX(1);}
}
/* Glow dorado animado por los bordes */
.glow-anim-borders {
  animation: glowPulse 2.7s infinite;
}
@keyframes glowPulse {
  0%,100% { opacity: 1; }
  50% { opacity: 0.83; }
}
/* Glow robot menos opaco */
.glow-anim-robot {
  opacity: 0.8;
}
/* Sombra en textos para mejorar contraste */
text {
  text-shadow: 0 1px 3px #fff4e0;
}
/* Sombra extra en el título principal */
text[font-size="26"] {
  text-shadow: 0 2px 8px #FFD70055;
}
</style>

<div class="center-svg">
<svg class="svg-responsive" width="400" height="210" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Banner multimedia: música, videos y podcasts">
  <title>Kevinborja.com</title>
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
  <ellipse class="glow-anim-borders" cx="200" cy="105" rx="196" ry="104" fill="url(#glow-borders)" />
  <!-- Fondo blanco degradado -->
  <rect width="400" height="210" rx="32" fill="url(#bg)" />
  <!-- Glow dorado detrás del robot -->
  <ellipse class="glow-anim-robot" cx="200" cy="50" rx="45" ry="23" fill="url(#glow-robot)" />
  <!-- Robot/diadema perfectamente centrado -->
  <g class="headphone-emoji">
    <circle cx="200" cy="50" r="36" fill="#fff"/>
    <rect x="164" y="31" width="72" height="22" rx="11" fill="#7c5fff"/>
    <rect x="178" y="26" width="44" height="8" rx="4" fill="#FFD700"/>
    <rect x="170" y="62" width="14" height="14" rx="7" fill="#00e580"/>
    <rect x="216" y="62" width="14" height="14" rx="7" fill="#00e580"/>
    <circle cx="190" cy="58" r="5" fill="#22223b"/>
    <circle cx="210" cy="58" r="5" fill="#22223b"/>
    <rect x="191" y="71" width="18" height="4" rx="2" fill="#FFD700"/>
  </g>
  <!-- Título central -->
  <text x="200" y="105" text-anchor="middle" fill="#22223b" font-size="26" font-family="monospace" font-weight="bold">
    Música, Videos y Podcasts
  </text>
  <text x="200" y="130" text-anchor="middle" fill="#FFD700" font-size="20" font-family="monospace" font-weight="bold">
    Descubre, aprende y sonríe
  </text>
  <text x="200" y="148" text-anchor="middle" fill="#00e580" font-size="17" font-family="monospace">
    Innovador & chill
  </text>
  <text x="200" y="166" text-anchor="middle" fill="#7c5fff" font-size="16" font-family="monospace">
    🎨  |  🎵  |  🤓  |  🎬  
  </text>
  <text x="200" y="190" text-anchor="middle" fill="#22223b" font-size="15" font-family="monospace">
    Relájate y disfruta contenido único
  </text>
  <!-- Onda animada -->
  <path class="wave-anim" d="M0,200 Q100,185 200,200 T400,200" fill="none" stroke="url(#wave)" stroke-width="7"/>
  <!-- TORTUGA ELIMINADA -->
  <!-- Cohete con llama sincronizada y estilizada -->
  <g class="rocket-anim">
    <rect x="375" y="162" width="6" height="26" rx="3" fill="url(#rocket-border)" opacity="0.7"/>
    <rect x="377" y="180" width="4" height="12" rx="2" fill="#7c5fff" opacity="0.5"/>
    <rect x="370" y="138" width="16" height="29" rx="8" fill="url(#rocket-body)" stroke="url(#rocket-border)" stroke-width="2"/>
    <polygon points="378,136 386,136 382,122" fill="#FFD700"stroke="#fff4e0" stroke-width="1"/>
    <circle cx="378" cy="152" r="4" fill="#00e580" stroke="#FFD700" stroke-width="1"/>
    <rect x="374" y="167" width="8" height="8" rx="4" fill="#22223b"/>
    <!-- Llama animada, sincronizada y estilizada -->
    <polygon class="flame-anim" points="372,175 384,175 378,193" fill="url(#flame)"/>
    <!-- Chispa/fogonazo para realismo -->
    <ellipse class="flame-anim" cx="378" cy="195" rx="2.2" ry="0.9" fill="#FFD700" opacity="0.68"/>
    <ellipse cx="378" cy="144" rx="2.2" ry="1.1" fill="#fff" opacity="0.5"/>
    <ellipse cx="374" cy="160" rx="1.2" ry="0.6" fill="#fff" opacity="0.3"/>
  </g>
</svg>
</div>

Espero que disfrutes la experiencia y te sumes a esta aventura. ¡Gracias por tu visita y bienvenido/a!
