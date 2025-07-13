import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const comentariosPath = path.resolve("public/comentarios.json");

  // Leer comentarios existentes
  let comentarios: any[] = [];
  try {
    comentarios = JSON.parse(fs.readFileSync(comentariosPath, "utf-8"));
  } catch {
    comentarios = [];
  }

  // Añadir nuevo comentario
  comentarios.push({
    nombre: data.nombre || "Anónimo",
    comentario: data.comentario,
    fecha: new Date().toISOString()
  });

  fs.writeFileSync(comentariosPath, JSON.stringify(comentarios, null, 2));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
