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
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Núcleo Energético Tecnológico Avanzado</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: 
                radial-gradient(circle at 10% 20%, #0a1128, transparent 30%),
                radial-gradient(circle at 90% 80%, #1c0b36, transparent 30%),
                linear-gradient(135deg, #0a0e2b, #1a0f3a, #0a1c45);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            padding: 20px;
        }
        
        .container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 1200px;
            width: 100%;
            z-index: 10;
        }
        
        header {
            text-align: center;
            margin-bottom: 40px;
            color: white;
            z-index: 20;
        }
        
        h1 {
            font-size: 3.5rem;
            margin-bottom: 15px;
            text-shadow: 0 0 15px rgba(101, 227, 255, 0.8);
            letter-spacing: 2px;
            background: linear-gradient(to right, #65e3ff, #9d7bff, #ff6ec7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            text-transform: uppercase;
        }
        
        .subtitle {
            font-size: 1.3rem;
            opacity: 0.85;
            max-width: 700px;
            margin: 0 auto;
            line-height: 1.6;
            color: #cbd5ff;
        }
        
        .card {
            background: rgba(10, 15, 35, 0.5);
            backdrop-filter: blur(15px);
            border-radius: 25px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.7),
                inset 0 0 20px rgba(101, 227, 255, 0.2);
            padding: 40px;
            width: 100%;
            max-width: 900px;
            border: 1px solid rgba(101, 227, 255, 0.3);
            position: relative;
            overflow: hidden;
            z-index: 15;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to right, #65e3ff, #9d7bff, #ff6ec7);
            box-shadow: 0 0 20px rgba(101, 227, 255, 0.7);
        }
        
        .svg-container {
            position: relative;
            width: 100%;
            height: 500px;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-radius: 15px;
        }
        
        .glow-circle {
            position: absolute;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            filter: blur(80px);
            z-index: 1;
        }
        
        .glow-1 {
            top: 10%;
            left: 10%;
            background: radial-gradient(circle, rgba(101, 227, 255, 0.3), transparent 70%);
            animation: pulse 8s infinite alternate;
        }
        
        .glow-2 {
            bottom: 10%;
            right: 10%;
            background: radial-gradient(circle, rgba(157, 123, 255, 0.3), transparent 70%);
            animation: pulse 10s infinite alternate;
        }
        
        .glow-3 {
            top: 40%;
            right: 20%;
            background: radial-gradient(circle, rgba(255, 110, 199, 0.3), transparent 70%);
            animation: pulse 7s infinite alternate;
        }
        
        @keyframes pulse {
            0% { opacity: 0.3; transform: scale(0.95); }
            100% { opacity: 0.7; transform: scale(1.05); }
        }
        
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes glow-pulse {
            0%, 100% { filter: drop-shadow(0 0 5px #65e3ff); }
            50% { filter: drop-shadow(0 0 20px #65e3ff); }
        }
        
        @keyframes float {
            0%, 100% { transform: translate(0, 0); opacity: 0; }
            10% { opacity: 1; }
            25% { transform: translate(40px, 70px); }
            50% { transform: translate(80px, 20px); }
            75% { transform: translate(20px, 100px); }
            90% { opacity: 1; }
        }
        
        @keyframes core-pulse {
            0% { r: 60; opacity: 0.8; }
            50% { r: 70; opacity: 1; }
            100% { r: 60; opacity: 0.8; }
        }
        
        @keyframes ring-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes particle-emit {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes hex-grid-pulse {
            0% { stroke-opacity: 0.3; }
            50% { stroke-opacity: 0.8; }
            100% { stroke-opacity: 0.3; }
        }
        
        .tech-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 40px;
            width: 100%;
            max-width: 900px;
        }
        
        .detail-card {
            background: rgba(10, 15, 35, 0.6);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(101, 227, 255, 0.2);
            transition: all 0.3s ease;
        }
        
        .detail-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }
        
        .detail-title {
            color: #65e3ff;
            font-size: 1.2rem;
            margin-bottom: 10px;
        }
        
        .detail-value {
            color: white;
            font-size: 1.8rem;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(101, 227, 255, 0.5);
        }
    </style>
</head>
<body>
    <div class="glow-circle glow-1"></div>
    <div class="glow-circle glow-2"></div>
    <div class="glow-circle glow-3"></div>
    
    <div class="container">
        <header>
            <h1>Núcleo Energético Tecnológico</h1>
            <p class="subtitle">Diseño avanzado con matriz cuántica, hexágonos holográficos y sistema de partículas subatómicas</p>
        </header>
        
        <div class="card">
            <div class="svg-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
                    <!-- Fondo transparente -->
                    <rect width="100%" height="100%" fill="none"/>
                    
                    <!-- Anillos orbitales épicos -->
                    <g stroke="url(#gradient-ring)" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="20,10">
                        <path d="M400,300 m-200,0 a200,200 0 1,0 400,0 a200,200 0 1,0 -400,0">
                            <animate attributeName="stroke-dashoffset" from="0" to="628" dur="25s" repeatCount="indefinite" />
                        </path>
                        <path d="M400,300 m-150,0 a150,150 0 1,0 300,0 a150,150 0 1,0 -300,0">
                            <animate attributeName="stroke-dashoffset" from="628" to="0" dur="20s" repeatCount="indefinite" />
                        </path>
                        <path d="M400,300 m-250,0 a250,250 0 1,0 500,0 a250,250 0 1,0 -500,0">
                            <animate attributeName="stroke-dashoffset" from="0" to="1570" dur="30s" repeatCount="indefinite" />
                        </path>
                    </g>
                    
                    <!-- Núcleo energético avanzado -->
                    <g transform="translate(400,300)">
                        <!-- Matriz de hexágonos internos -->
                        <g stroke="#65e3ff" stroke-width="0.8" fill="none" stroke-opacity="0.3">
                            <path d="M0,-60 L51.96,-30 L51.96,30 L0,60 L-51.96,30 L-51.96,-30 Z">
                                <animate attributeName="stroke-opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" />
                            </path>
                            <path d="M0,-40 L34.64,-20 L34.64,20 L0,40 L-34.64,20 L-34.64,-20 Z">
                                <animate attributeName="stroke-opacity" values="0.3;0.8;0.3" dur="3.5s" repeatCount="indefinite" />
                            </path>
                            <path d="M0,-20 L17.32,-10 L17.32,10 L0,20 L-17.32,10 L-17.32,-10 Z">
                                <animate attributeName="stroke-opacity" values="0.3;0.9;0.3" dur="3s" repeatCount="indefinite" />
                            </path>
                        </g>
                        
                        <!-- Rejilla tecnológica interna -->
                        <g stroke="#9d7bff" stroke-width="0.5" stroke-opacity="0.4">
                            <line x1="0" y1="-60" x2="0" y2="60" />
                            <line x1="-51.96" y1="-30" x2="51.96" y2="30" />
                            <line x1="-51.96" y1="30" x2="51.96" y2="-30" />
                            <line x1="0" y1="-60" x2="51.96" y2="-30" />
                            <line x1="0" y1="-60" x2="-51.96" y2="-30" />
                            <line x1="51.96" y1="-30" x2="51.96" y2="30" />
                            <line x1="51.96" y1="30" x2="0" y2="60" />
                            <line x1="0" y1="60" x2="-51.96" y2="30" />
                            <line x1="-51.96" y1="30" x2="-51.96" y2="-30" />
                        </g>
                        
                        <!-- Esfera central con efecto cuántico -->
                        <circle r="60" fill="url(#quantum-core)" stroke="url(#core-glow)" stroke-width="3">
                            <animate attributeName="r" values="60;70;60" dur="3s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
                        </circle>
                        
                        <!-- Partículas cuánticas -->
                        <g>
                            <circle cx="0" cy="0" r="2" fill="#65e3ff">
                                <animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite" />
                                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;20;0" dur="4s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="0" r="2" fill="#9d7bff">
                                <animate attributeName="r" values="2;4;2" dur="1.8s" repeatCount="indefinite" />
                                <animateTransform attributeName="transform" type="rotate" from="120" to="480" dur="10s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;25;0" dur="5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="0" r="2" fill="#ff6ec7">
                                <animate attributeName="r" values="2;6;2" dur="2.2s" repeatCount="indefinite" />
                                <animateTransform attributeName="transform" type="rotate" from="240" to="600" dur="12s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;30;0" dur="6s" repeatCount="indefinite" />
                            </circle>
                        </g>
                        
                        <!-- Anillo de energía rotatorio -->
                        <g transform="rotate(0)">
                            <circle r="80" fill="none" stroke="url(#ring-gradient)" stroke-width="3" stroke-dasharray="10,15">
                                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
                            </circle>
                            <g transform="rotate(0)">
                                <circle cx="80" cy="0" r="5" fill="#65e3ff">
                                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="15s" repeatCount="indefinite" />
                                    <animate attributeName="r" values="5;8;5" dur="3s" repeatCount="indefinite" />
                                </circle>
                                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="25s" repeatCount="indefinite" />
                            </g>
                        </g>
                        
                        <!-- Rayos de energía avanzados -->
                        <g stroke="url(#gradient-ray)" stroke-width="3" stroke-linecap="round">
                            <line x1="-80" y1="0" x2="-180" y2="0">
                                <animate attributeName="x2" values="-180; -220; -180" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="stroke-opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
                            </line>
                            <line x1="80" y1="0" x2="180" y2="0">
                                <animate attributeName="x2" values="180; 220; 180" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="stroke-opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="-80" x2="0" y2="-180">
                                <animate attributeName="y2" values="-180; -220; -180" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="stroke-opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
                            </line>
                            <line x1="0" y1="80" x2="0" y2="180">
                                <animate attributeName="y2" values="180; 220; 180" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="stroke-opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
                            </line>
                            <line x1="-56.6" y1="-56.6" x2="-141.4" y2="-141.4">
                                <animate attributeName="x2" values="-141.4; -176.8; -141.4" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="y2" values="-141.4; -176.8; -141.4" dur="4s" repeatCount="indefinite" />
                            </line>
                            <line x1="56.6" y1="56.6" x2="141.4" y2="141.4">
                                <animate attributeName="x2" values="141.4; 176.8; 141.4" dur="4s" repeatCount="indefinite" />
                                <animate attributeName="y2" values="141.4; 176.8; 141.4" dur="4s" repeatCount="indefinite" />
                            </line>
                        </g>
                        
                        <!-- Emisión de partículas -->
                        <g>
                            <circle cx="0" cy="0" r="1" fill="#65e3ff" opacity="0">
                                <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;100" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="cy" values="0;50" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="0" r="1" fill="#9d7bff" opacity="0">
                                <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.3s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;-120" dur="2.5s" repeatCount="indefinite" />
                                <animate attributeName="cy" values="0;-70" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="0" cy="0" r="1" fill="#ff6ec7" opacity="0">
                                <animate attributeName="opacity" values="0;1;0" dur="1s" begin="0.6s" repeatCount="indefinite" />
                                <animate attributeName="cx" values="0;90" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="cy" values="0;-100" dur="3s" repeatCount="indefinite" />
                            </circle>
                        </g>
                    </g>
                    
                    <!-- Circuitos complejos -->
                    <g stroke="url(#gradient-circuit)" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="10,5">
                        <path d="M100,100 Q200,50 300,100 T500,100">
                            <animate attributeName="stroke-dashoffset" from="0" to="100" dur="8s" repeatCount="indefinite" />
                        </path>
                        <path d="M100,500 Q200,550 300,500 T500,500">
                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="7s" repeatCount="indefinite" />
                        </path>
                        <path d="M700,200 Q650,300 700,400">
                            <animate attributeName="stroke-dashoffset" from="0" to="50" dur="6s" repeatCount="indefinite" />
                        </path>
                    </g>
                    
                    <!-- Fragmentos de código holográficos -->
                    <g font-family="monospace" font-size="14" fill="#65e3ff" opacity="0.7" text-anchor="middle">
                        <text x="200" y="400">
                            <tspan x="200" dy="0">const quantumCore = new Core({</tspan>
                            <tspan x="200" dy="20">energy: "infinite",</tspan>
                            <tspan x="200" dy="20">tech: "quantum"</tspan>
                            <tspan x="200" dy="20">});</tspan>
                            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="6s" repeatCount="indefinite" />
                            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-5; 0,0" dur="5s" repeatCount="indefinite" />
                        </text>
                        
                        <text x="600" y="200">
                            <tspan x="600" dy="0">function emitParticles() {</tspan>
                            <tspan x="600" dy="20">core.generateEnergy();</tspan>
                            <tspan x="600" dy="20">}</tspan>
                            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="5s" repeatCount="indefinite" />
                            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-5; 0,0" dur="6s" repeatCount="indefinite" />
                        </text>
                    </g>
                    
                    <!-- Gradientes -->
                    <defs>
                        <radialGradient id="quantum-core" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stop-color="#65e3ff" stop-opacity="0.9" />
                            <stop offset="40%" stop-color="#9d7bff" stop-opacity="0.7" />
                            <stop offset="70%" stop-color="#ff6ec7" stop-opacity="0.5" />
                            <stop offset="100%" stop-color="#0a1128" stop-opacity="0" />
                        </radialGradient>
                        
                        <linearGradient id="core-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#65e3ff" />
                            <stop offset="100%" stop-color="#ff6ec7" />
                        </linearGradient>
                        
                        <linearGradient id="gradient-ray" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#65e3ff" stop-opacity="0.8" />
                            <stop offset="100%" stop-color="#ff6ec7" stop-opacity="0.2" />
                        </linearGradient>
                        
                        <linearGradient id="gradient-circuit" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#65e3ff" />
                            <stop offset="100%" stop-color="#9d7bff" />
                        </linearGradient>
                        
                        <linearGradient id="gradient-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#65e3ff" />
                            <stop offset="50%" stop-color="#9d7bff" stop-opacity="0.7" />
                            <stop offset="100%" stop-color="#ff6ec7" stop-opacity="0.4" />
                        </linearGradient>
                        
                        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#65e3ff" />
                            <stop offset="50%" stop-color="#9d7bff" />
                            <stop offset="100%" stop-color="#ff6ec7" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
        
        <div class="tech-details">
            <div class="detail-card">
                <div class="detail-title">ENERGÍA DEL NÚCLEO</div>
                <div class="detail-value">4.8 TW</div>
            </div>
            <div class="detail-card">
                <div class="detail-title">PARTÍCULAS CUÁNTICAS</div>
                <div class="detail-value">2.4M/s</div>
            </div>
            <div class="detail-card">
                <div class="detail-title">TEMPERATURA</div>
                <div class="detail-value">12.8 MK</div>
            </div>
            <div class="detail-card">
                <div class="detail-title">ESTABILIDAD</div>
                <div class="detail-value">98.7%</div>
            </div>
        </div>
    </div>

    <script>
        // Animación para los detalles técnicos
        const detailCards = document.querySelectorAll('.detail-card');
        detailCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const value = card.querySelector('.detail-value');
                value.style.transform = 'scale(1.1)';
                value.style.transition = 'transform 0.3s ease';
            });
            
            card.addEventListener('mouseleave', () => {
                const value = card.querySelector('.detail-value');
                value.style.transform = 'scale(1)';
            });
        });
    </script>
</body>
</html>

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
