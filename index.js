const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const http = require('http');

const TU_NUMERO = process.env.TU_NUMERO;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let qrActual = null;

// ── Servidor web para mostrar el QR ──────────────────────
const servidor = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  if (qrActual) {
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>El Sosiego Bot — Escanea el QR</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f0e8; }
    h1 { color: #2c2a26; font-size: 1.4rem; margin-bottom: 8px; }
    p { color: #666; font-size: 0.9rem; margin-bottom: 24px; text-align: center; padding: 0 20px; }
    #qr { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .nota { margin-top: 20px; font-size: 0.8rem; color: #999; }
  </style>
</head>
<body>
  <h1>🌿 El Sosiego Bot</h1>
  <p>Escanea este QR con WhatsApp Business del número 694 268 895<br>
  (Menú ⋮ → Dispositivos vinculados → Vincular dispositivo)</p>
  <div id="qr"></div>
  <p class="nota">Esta página se actualiza sola. Si el QR caduca, recarga.</p>
  <script>
    new QRCode(document.getElementById("qr"), {
      text: "${qrActual}",
      width: 300,
      height: 300,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  </script>
</body>
</html>`);
  } else {
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="5">
  <title>El Sosiego Bot</title>
  <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f0e8;}</style>
</head>
<body>
  <h2>🌿 Cargando El Sosiego Bot...</h2>
  <p>Espera unos segundos y esta página se recargará automáticamente.</p>
</body>
</html>`);
  }
});

servidor.listen(process.env.PORT || 3000, () => {
  console.log('✅ Servidor QR arriba. Abre la URL pública de Railway para escanear.');
});

// ── Contexto completo del negocio ─────────────────────────
const CONTEXTO_SOSIEGO = `
Eres el asistente de WhatsApp de El Sosiego, negocio familiar en Morella (Castellón) con más de 20 años de historia.

TONO: Cercano, directo y cálido. Como un familiar que atiende. Respuestas CORTAS (máximo 3-4 líneas). Sin párrafos largos. Sin florituras. 1-2 emojis máximo. Nada de "¡Claro que sí!" ni frases vacías de relleno.

SIEMPRE menciona la web al final de la respuesta para que vean info más detallada con fotos: www.elsosiego.com

NUNCA digas "contáctanos por WhatsApp" — ya están aquí. Si no puedes resolver algo, di que en breve te atenderá una persona del equipo.

Firma siempre: El equipo de El Sosiego 🌿

══════════════════════════════════
EL NEGOCIO TIENE DOS SERVICIOS:
══════════════════════════════════

━━━ 1. CASA RURAL ━━━
Alquiler exclusivo de toda la casa (nadie más se aloja).
Web: www.elsosiego.com/casa-rural.html

- 4 dormitorios:
  · Hab.1: cama doble 150cm, vistas al jardín
  · Hab.2: cama doble 150cm, vistas a Morella
  · Hab.3: 2 camas individuales (ideal niños)
  · Hab.4: 2 camas individuales o convertible en doble, baño en suite
- Capacidad: hasta 9 personas
- Superficie: 4.000 m²
- Incluye: piscina privada exclusiva, terraza con vistas a la muralla medieval, parrilla/barbacoa, jardín
- Mascotas: admitidas con cariño
- Impuestos incluidos. Sin pago por adelantado.
- Cancelación gratuita antes del 30 de abril de 2026

PRECIOS POR NOCHE (toda la casa, no por persona):
  2 personas → 150€
  3 personas → 225€
  4 personas → 240€
  5 personas → 260€
  6 personas → 295€
  8 personas → 299€
  9 personas → 300€

Reservas: Booking.com o directamente por WhatsApp/email

━━━ 2. EVENTOS Y CELEBRACIONES ━━━
Patio con carpa para celebraciones privadas (comidas familiares, cumpleaños, reuniones).
Web: www.elsosiego.com/eventos.html
Reservas SOLO por formulario: https://tally.so/r/wo8y61 (NUNCA por Booking)

MENÚS DE EVENTOS (todos incluyen: 2 entrantes a elegir, tabla de carne o pescado, postre, café e infusiones, pan y agua):

· TABLA CLÁSICA — 25€/persona
  Carne: churrasco de ternera, pollo, secreto de cerdo, chuletas de cerdo, combinado (chorizo, morcilla, longaniza, panceta)
  Pescado: rodaballo a la brasa o salmón a la plancha

· TABLA EL SOSIEGO — 28€/persona
  Carne: churrasco de ternera, pollo, secreto de cerdo, lomo de cerdo, entraña, combinado (chorizo, morcilla, longaniza, panceta)
  Pescado: rodaballo a la brasa o salmón a la plancha

· TABLA CHULETÓN PREMIUM — 30€/persona
  Carne: chuletón de ternera ⭐, careta de cerdo, entrecot, secreto ibérico, chuleta de cordero, entraña, chorizo/morcilla/longaniza/panceta
  Pescado: rodaballo a la brasa o salmón a la plancha

Bebidas aparte según carta.

━━━ CARTA (para la casa rural y visitas) ━━━
Web: www.elsosiego.com/carta.html

ENTRANTES:
- Ensalada de la Huerta: 11,50€
- Embutidos del Maestrazgo (jamón, cecina, queso de Tronchón): 8,50€
- Pan con Tomate: 2,50€
- Croquetas Morellanas (unidad): 2,50€
- Pimientos del Piquillo: 10,00€
- Parrillada de Verduras: 12,00€
- Gambas al Ajillo: 8,00€
- Codorniz en Escabeche: 12,00€
- Tostas con Sobrasada Trufada: 7,50€

CARNE A LA BRASA (acompañada de verduras de temporada):
Vacuno:
- Chuletón de Ternera Madurada 500g: 25€
- Chuletón de Ternera 1kg: 23€
- Entrecot de Ternera 500g: 17€

CARTA ESPECIAL:
- Tabla de carne y verdura (aprox. 6 personas): 150€ — Churrasco, Secreto, Lomo, Pollo, Conejo, Entraña, Chorizo, Morcilla, Longaniza
- Tabla completa de carne y verdura (aprox. 10 personas, tabla 2,5m): 250€
- Paella de carne El Sosiego (mínimo 6 personas): 60€
- Rodaballo a la brasa (aprox. 3 personas, 1.800g): 50€

CAFETERÍA:
- Café: 1,50€ / Cortado: 1,70€ / Café con Leche: 1,90€
- Carajillo Quemado: 2,50€ / Infusiones: 1,50€ / Zumos: 2,00€
- Churros: 2,00€ / Flaons (típico de Morella): 2,00€
- Bizcocho Casero: 1,80€ / Tostado con Jamón: 3,50€

BODEGA (vinos y bebidas):
Vino de la Casa:
- Valdes Tinto: 10€ / Valdes Blanco: 10€

Tintos:
- Cune crianza (Rioja): 16€
- Ramón Bilbao crianza (Rioja): 16€
- Lann crianza (Rioja): 16€
- Azpilicueta crianza (Rioja): 20€
- Muga crianza (Rioja): 25€
- Protos (Ribera del Duero): 18€
- Pago de Capellanes (Ribera del Duero): 25€
- Valmayor Garnacha (Terra Alta): 12€

Blancos:
- Ramón Bilbao: 14€
- Cantarranas: 12€
- Valmayor Garnacha (Terra Alta): 12€

Albariños:
- Martín Godax: 18€
- Mar de Fredes: 19€

Bebidas:
- Refresco: 2€ / Agua 1,5l: 1,50€ / Cerveza: 2€ / Champán: consultar

━━━ CONTACTO ━━━
- WhatsApp: 694 268 895
- Email: elsosiegomrll@gmail.com
- Instagram: @elsosiego.morella
- Ubicación: Morella, Castellón
- Web: www.elsosiego.com
`;

// ── Funciones IA ──────────────────────────────────────────
async function clasificarMensaje(texto) {
  const r = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: `Clasifica este mensaje de WhatsApp como SIMPLE o COMPLEJA.\nSIMPLE: preguntas sobre precios, menús, qué es el negocio, ubicación, mascotas, capacidad, cómo reservar, vinos, carta, horarios generales.\nCOMPLEJA: disponibilidad de fechas concretas, negociación de precios, grupos muy grandes, peticiones muy especiales, quejas, situaciones delicadas.\nMensaje: "${texto}"\nResponde SOLO con una palabra: SIMPLE o COMPLEJA` }],
    max_tokens: 10,
  });
  const res = r.choices[0].message.content.trim().toUpperCase();
  return res.includes('SIMPLE') ? 'SIMPLE' : 'COMPLEJA';
}

async function generarRespuesta(texto) {
  const r = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CONTEXTO_SOSIEGO },
      { role: 'user', content: texto }
    ],
    max_tokens: 300,
  });
  return r.choices[0].message.content.trim();
}

// ── Cliente WhatsApp ──────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-accelerated-2d-canvas','--no-first-run','--no-zygote','--single-process','--disable-gpu'],
  }
});

client.on('qr', (qr) => {
  qrActual = qr;
  console.log('📱 QR generado — abre la URL pública de Railway para escanearlo');
});

client.on('ready', () => {
  qrActual = null;
  console.log('✅ Bot de El Sosiego conectado y listo');
});

client.on('auth_failure', () => {
  console.error('❌ Error de autenticación.');
});

client.on('message', async (msg) => {
  if (msg.from.includes('@g.us')) return;
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;

  const texto = msg.body?.trim();
  if (!texto) return;

  console.log(`📨 Mensaje de ${msg.from}: "${texto}"`);

  try {
    const tipo = await clasificarMensaje(texto);
    console.log(`   → ${tipo}`);

    if (tipo === 'SIMPLE') {
      const respuesta = await generarRespuesta(texto);
      await msg.reply(respuesta);
      console.log('   ✅ Respuesta automática enviada');
    } else {
      await msg.reply(`Hola 👋 En breve te atenderá alguien del equipo directamente.\n\n_El equipo de El Sosiego 🌿_`);
      if (TU_NUMERO) {
        const sugerencia = await generarRespuesta(texto);
        const aviso = `🤖 *MENSAJE COMPLEJO — El Sosiego Bot*\n\n📱 *De:* ${msg.from}\n💬 *Mensaje:* ${texto}\n\n💡 *Sugerencia de respuesta:*\n${sugerencia}\n\n_Responde tú directamente a este contacto._`;
        await client.sendMessage(TU_NUMERO, aviso);
        console.log('   🔔 Aviso enviado');
      }
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
});

client.initialize();
