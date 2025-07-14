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
/* ...todo igual hasta la tortuga... */
.turtle-anim {
  animation: turtleWalk 38s linear infinite;
}
@keyframes turtleWalk {
  0%   { transform: translateX(0px);}
  100% { transform: translateX(390px);}
}
/* Patas con movimiento fluido y pegadas al cuerpo */
.turtle-leg {
  animation: turtleLegs 2.3s infinite alternate cubic-bezier(.7,.2,.2,.8);
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
@keyframes turtleLegs {
  0%   { transform: rotate(-6deg) scaleX(1);}
  100% { transform: rotate(10deg) scaleX(0.98);}
}
/* Cabeza gira suavemente y se estira un poco */
.turtle-head {
  animation: turtleHeadMove 3.2s infinite alternate cubic-bezier(.7,.2,.2,.8);
  transform-box: fill-box;
  transform-origin: 10% 50%;
}
@keyframes turtleHeadMove {
  0%   { transform: rotate(-6deg) scale(1,1);}
  50%  { transform: rotate(2deg) scale(1.05,1.03);}
  100% { transform: rotate(6deg) scale(1,1);}
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
  0%   { d: path("M27.2,200.2 Q27.1,200.8 27.8,200.7"); }
  50%  { d: path("M27.2,200.2 Q27.4,201.1 27.8,200.7"); }
  100% { d: path("M27.2,200.2 Q27.1,200.8 27.8,200.7"); }
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
  <!-- ...todo igual hasta la tortuga... -->
  <g class="turtle-anim" style="transform: translateY(-16px);">
    <!-- Sombra debajo de la tortuga -->
    <ellipse cx="20" cy="207" rx="7" ry="2.2" fill="#222" opacity="0.17"/>
    <!-- Caparazón más definido y centrado -->
    <ellipse class="turtle-shell" cx="20" cy="198.2" rx="6" ry="4.2" fill="#84d36b" stroke="#3a6b34" stroke-width="1.7"/>
    <!-- Cuerpo debajo del caparazón -->
    <ellipse cx="20" cy="199" rx="8" ry="5.2" fill="#3a6b34"/>
    <!-- Detalles caparazón -->
    <ellipse cx="18" cy="197" rx="1" ry="0.6" fill="#3a6b34" opacity="0.4"/>
    <ellipse cx="22" cy="197" rx="1" ry="0.6" fill="#3a6b34" opacity="0.4"/>
    <ellipse cx="20" cy="199.8" rx="1.5" ry="0.7" fill="#3a6b34" opacity="0.13"/>
    <!-- Cuello corto y pegado -->
    <ellipse class="turtle-neck" cx="24.5" cy="199.2" rx="0.9" ry="0.35" fill="#5e914e" opacity="0.19"/>
    <!-- Cabeza redondeada y pegada al caparazón -->
    <ellipse class="turtle-head" cx="26.2" cy="199.1" rx="1.5" ry="1.1" fill="#3a6b34"/>
    <!-- Ojo claro y centrado -->
    <circle class="turtle-eye" cx="26.8" cy="198.9" r="0.7" fill="#222"/>
    <circle cx="27" cy="198.7" r="0.15" fill="#fff" opacity="0.6"/>
    <!-- Patas delanteras animadas y pegadas -->
    <ellipse class="turtle-leg" cx="17.2" cy="202.9" rx="1.1" ry="0.45" fill="#5e914e"/>
    <ellipse class="turtle-leg" cx="22.8" cy="202.9" rx="1.1" ry="0.45" fill="#5e914e"/>
    <!-- Patas traseras animadas y pegadas -->
    <ellipse class="turtle-leg" cx="17.2" cy="196.3" rx="1" ry="0.4" fill="#5e914e"/>
    <ellipse class="turtle-leg" cx="22.8" cy="196.3" rx="1" ry="0.4" fill="#5e914e"/>
    <!-- Cola pequeña -->
    <ellipse cx="15.1" cy="199.1" rx="0.4" ry="0.13" fill="#5e914e" />
    <!-- Boca (sonrisa animada) pequeñita -->
    <path class="turtle-mouth" d="M27.2,200.2 Q27.1,200.8 27.8,200.7" stroke="#222" stroke-width="0.35" fill="none"/>
  </g>
  <!-- ...todo igual después... -->
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
