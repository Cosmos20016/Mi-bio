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
}
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 4.47s infinite; /* 10% más lenta que antes (4.065s * 1.1) */
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
}<style>
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
}
.wave-anim {
  stroke-dasharray: 900;
  stroke-dashoffset: 0;
  animation: waveBounce 4.47s infinite;
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
/* TORTUGA SUPER ESTILIZADA Y MUY LENTA */
.turtle-anim {
  animation: turtleWalk 38s linear infinite;
}
@keyframes turtleWalk {
  0%   { transform: translateX(0px);}
  100% { transform: translateX(390px);}
}
.turtle-leg {
  animation: turtleLegs 2.3s infinite alternate cubic-bezier(.7,.2,.2,.8);
}
@keyframes turtleLegs {
  0%   { transform: rotate(-8deg);}
  100% { transform: rotate(17deg);}
}
.turtle-head {
  animation: turtleHeadMove 3.2s infinite alternate cubic-bezier(.7,.2,.2,.8);
}
@keyframes turtleHeadMove {
  0%   { transform: rotate(-8deg) scale(1,1);}
  50%  { transform: rotate(3deg) scale(1.08,1.03);}
  100% { transform: rotate(8deg) scale(1,1);}
}
.turtle-eye {
  animation: turtleBlink 7.6s infinite cubic-bezier(.7,.2,.2,.8);
}
@keyframes turtleBlink {
  0%, 88% { r: 0.7; }
  90%, 92% { r: 0.18; }
  94%, 100% { r: 0.7; }
}
.turtle-shell {
  animation: shellShine 3s infinite alternate cubic-bezier(.7,.2,.2,.8);
}
@keyframes shellShine {
  0% { filter: brightness(1.05);}
  100% { filter: brightness(1.23);}
}
.turtle-mouth {
  animation: turtleSmile 7.8s infinite alternate cubic-bezier(.7,.2,.2,.8);
}
@keyframes turtleSmile {
  0%   { d: path("M28,201.7 Q27.8,201.3 28.7,201.2"); }
  50%  { d: path("M28,201.7 Q28.2,201.7 28.7,201.2"); }
  100% { d: path("M28,201.7 Q27.8,201.3 28.7,201.2"); }
}
.turtle-neck {
  animation: turtleNeck 3.2s infinite alternate cubic-bezier(.7,.2,.2,.8);
}
@keyframes turtleNeck {
  0%   { opacity: 0.18;}
  50%  { opacity: 0.4;}
  100% { opacity: 0.18;}
}
</style>

<div class="center-svg">
<svg class="svg-responsive" width="400" height="210" viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- ... (definiciones no modificadas) ... -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f6f8fa" />
      <stop offset="100%" stop-color="#fff4e0" />
    </linearGradient>
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c5fff" />
      <stop offset="40%" stop-color="#00e580" />
      <stop offset="100%" stop-color="#FFD700" />
    </linearGradient>
    <radialGradient id="glow-borders" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.0"/>
      <stop offset="68%" stop-color="#FFD700" stop-opacity="0.12"/>
      <stop offset="98%" stop-color="#FFD700" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#fff4e0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-robot" cx="50%" cy="50%" r="85%">
      <stop offset="0%" stop-color="#FFD700" stop-opacity="0.33"/>
      <stop offset="100%" stop-color="#fff4e0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rocket-border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#fff4e0"/>
    </linearGradient>
    <linearGradient id="rocket-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="100%" stop-color="#fff4e0"/>
    </linearGradient>
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

  <!-- ... (todo lo demás igual) ... -->

  <!-- Tortuga animada recorriendo la línea inferior - POSICIONES AJUSTADAS -->
  <g class="turtle-anim" style="transform: translateY(-16px);">
    <!-- Sombra -->
    <ellipse cx="20" cy="207" rx="7" ry="2.2" fill="#222" opacity="0.17"/>
    <!-- Cuerpo principal -->
    <ellipse cx="20" cy="200" rx="8.5" ry="6" fill="#3a6b34"/>
    <!-- Caparazón con brillo -->
    <ellipse class="turtle-shell" cx="20" cy="197" rx="6.2" ry="4.5" fill="#84d36b" stroke="#3a6b34" stroke-width="1.7"/>
    <!-- Detalles caparazón -->
    <ellipse cx="17.7" cy="195.5" rx="1.1" ry="0.7" fill="#3a6b34" opacity="0.4"/>
    <ellipse cx="22.3" cy="195.5" rx="1.1" ry="0.7" fill="#3a6b34" opacity="0.4"/>
    <ellipse cx="20" cy="198.5" rx="1.7" ry="0.9" fill="#3a6b34" opacity="0.16"/>
    <!-- Cuello flexible (más pegado) -->
    <ellipse class="turtle-neck" cx="24.6" cy="199.7" rx="1.1" ry="0.4" fill="#5e914e" opacity="0.19"/>
    <!-- Cabeza más pegada y chica -->
    <ellipse class="turtle-head" cx="27.2" cy="199.7" rx="2.2" ry="1.6" fill="#3a6b34"/>
    <!-- Ojo con animación de parpadeo y brillo -->
    <circle class="turtle-eye" cx="28" cy="199.7" r="0.7" fill="#222"/>
    <circle cx="28.2" cy="199.3" r="0.19" fill="#fff" opacity="0.7"/>
    <!-- Patas animadas más pegadas al cuerpo -->
    <ellipse class="turtle-leg" cx="16.3" cy="204.2" rx="1.8" ry="0.7" fill="#5e914e"/>
    <ellipse class="turtle-leg" cx="23.7" cy="204.2" rx="1.8" ry="0.7" fill="#5e914e"/>
    <ellipse class="turtle-leg" cx="16.3" cy="197.2" rx="1.7" ry="0.5" fill="#5e914e"/>
    <ellipse class="turtle-leg" cx="23.7" cy="197.2" rx="1.7" ry="0.5" fill="#5e914e"/>
    <!-- Cola -->
    <ellipse cx="13.5" cy="200.3" rx="0.7" ry="0.25" fill="#5e914e" />
    <!-- Boca (sonrisa animada) más pequeña, centrada -->
    <path class="turtle-mouth" d="M28,201.2 Q27.8,200.9 28.5,200.8" stroke="#222" stroke-width="0.4" fill="none"/>
  </g>
  <!-- Cohete con llama sincronizada y estilizada -->
  <g class="rocket-anim">
    <rect x="375" y="162" width="6" height="26" rx="3" fill="url(#rocket-border)" opacity="0.7"/>
    <rect x="377" y="180" width="4" height="12" rx="2" fill="#7c5fff" opacity="0.5"/>
    <rect x="370" y="138" width="16" height="29" rx="8" fill="url(#rocket-body)" stroke="url(#rocket-border)" stroke-width="2"/>
    <polygon points="378,136 386,136 382,122" fill="#FFD700" stroke="#fff4e0" stroke-width="1"/>
    <circle cx="378" cy="152" r="4" fill="#00e580" stroke="#FFD700" stroke-width="1"/>
    <rect x="374" y="167" width="8" height="8" rx="4" fill="#22223b"/>
    <polygon class="flame-anim" points="372,175 384,175 378,193" fill="url(#flame)"/>
    <ellipse class="flame-anim" cx="378" cy="195" rx="2.2" ry="0.9" fill="#FFD700" opacity="0.68"/>
    <ellipse cx="378" cy="144" rx="2.2" ry="1.1" fill="#fff" opacity="0.5"/>
    <ellipse cx="374" cy="160" rx="1.2" ry="0.6" fill="#fff" opacity="0.3"/>
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
