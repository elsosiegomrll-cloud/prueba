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

// ── Contexto del negocio ──────────────────────────────────
const CONTEXTO_SOSIEGO = `
Eres el asistente virtual de El Sosiego, un negocio familiar con más de 20 años de historia en Morella (Castellón, España).
Hablas siempre en español, con un tono cercano, cálido y familiar. Sin tecnicismos. Como si fuera un familiar atendiendo.

EL NEGOCIO TIENE DOS SERVICIOS COMPLETAMENTE DISTINTOS:

CASA RURAL:
- Alquiler exclusivo de toda la casa. Nadie más se aloja.
- 4 dormitorios: Hab.1 (cama doble 150cm, vistas al jardín), Hab.2 (cama doble 150cm, vistas a Morella), Hab.3 (2 camas individuales, ideal niños), Hab.4 (2 camas individuales o convertible en doble, baño en suite)
- Capacidad: hasta 9 personas. Superficie: 4.000 m²
- Incluye: piscina privada exclusiva, terraza panorámica con vistas a la muralla medieval de Morella, parrilla/barbacoa exterior, jardín
- Mascotas: admitidas con cariño
- PRECIOS POR NOCHE (toda la casa, no por persona):
  2 personas: 150€ / 3 personas: 225€ / 4 personas: 240€
  5 personas: 260€ / 6 personas: 295€ / 8 personas: 299€ / 9 personas: 300€
- Impuestos incluidos. Sin pago por adelantado.
- Reservas: por Booking.com o directamente por WhatsApp/email

EVENTOS Y CELEBRACIONES:
- Patio con carpa para celebraciones privadas
- Tres menús (todos incluyen: 2 entrantes a elegir, tabla de carne o pescado, postre, café, pan y agua):
  · TABLA CLÁSICA — 25€/persona: churrasco de ternera, pollo, secreto de cerdo, chuletas, combinado embutidos
  · TABLA EL SOSIEGO — 28€/persona: churrasco, pollo, secreto, lomo, entraña, combinado embutidos
  · TABLA CHULETÓN PREMIUM — 30€/persona: chuletón de ternera, careta, entrecot, secreto ibérico, chuleta de cordero, entraña, embutidos
  Todos con opción de pescado: rodaballo a la brasa o salmón a la plancha
- Bebidas aparte según carta
- Reservas de eventos: SOLO por formulario en https://tally.so/r/wo8y61

CONTACTO:
- WhatsApp: 694 268 895
- Email: elsosiegomrll@gmail.com
- Instagram: @elsosiego.morella
- Ubicación: Morella, Castellón

REGLAS:
1. Si no sabes algo con certeza, NO inventes. Di que lo consultarás y responderás en breve.
2. Para disponibilidad de fechas, di siempre que lo consulten directamente.
3. Sé breve y claro. Máximo 3-4 párrafos. Usa 1-2 emojis por mensaje.
4. Firma siempre como "El equipo de El Sosiego 🌿"
`;

// ── Funciones IA con Groq ─────────────────────────────────
async function clasificarMensaje(texto) {
  const r = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: `Clasifica este mensaje de WhatsApp como SIMPLE o COMPLEJA.\nSIMPLE: preguntas generales sobre qué es el negocio, precios, menús, ubicación, mascotas, capacidad, cómo reservar.\nCOMPLEJA: disponibilidad de fechas concretas, negociación de precios, grupos muy grandes, peticiones especiales, quejas.\nMensaje: "${texto}"\nResponde SOLO con una palabra: SIMPLE o COMPLEJA` }],
    max_tokens: 10,
  });
  const res = r.choices[0].message.content.trim().toUpperCase();
  return res.includes('SIMPLE') ? 'SIMPLE' : 'COMPLEJA';
}

async function generarRespuesta(texto) {
  const r = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: CONTEXTO_SOSIEGO },
      { role: 'user', content: texto }
    ],
    max_tokens: 400,
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
      const sugerencia = await generarRespuesta(texto);
      await msg.reply(`Hola 👋 Gracias por contactar con El Sosiego. Tu consulta requiere nuestra atención personalizada. Te respondemos en breve 🌿\n\n_El equipo de El Sosiego_`);
      if (TU_NUMERO) {
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
