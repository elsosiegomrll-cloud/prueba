const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Configuración ──────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TU_NUMERO     = process.env.TU_NUMERO; // ej: "34677473362@c.us"

const genAI  = new GoogleGenerativeAI(GEMINI_API_KEY);
const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ── Contexto del negocio ───────────────────────────────────
const CONTEXTO_SOSIEGO = `
Eres el asistente virtual de El Sosiego, un negocio familiar con más de 20 años de historia en Morella (Castellón, España).
Hablas siempre en español, con un tono cercano, cálido y familiar. Sin tecnicismos. Como si fuera un familiar atendiendo.

EL NEGOCIO TIENE DOS SERVICIOS COMPLETAMENTE DISTINTOS:

═══ CASA RURAL ═══
- Alquiler exclusivo de toda la casa. Nadie más se aloja.
- 4 dormitorios: Hab.1 (cama doble 150cm, vistas al jardín), Hab.2 (cama doble 150cm, vistas a Morella), Hab.3 (2 camas individuales, ideal niños), Hab.4 (2 camas individuales o convertible en doble, baño en suite)
- Capacidad: hasta 9 personas
- Superficie: 4.000 m²
- Incluye: piscina privada de uso exclusivo, terraza panorámica con vistas a la muralla medieval de Morella, parrilla/barbacoa exterior, jardín
- Mascotas: admitidas con cariño
- PRECIOS POR NOCHE (precio para toda la casa, no por persona):
  · 2 personas: 150€
  · 3 personas: 225€
  · 4 personas: 240€
  · 5 personas: 260€
  · 6 personas: 295€
  · 8 personas: 299€
  · 9 personas: 300€
- Impuestos incluidos. Sin pago por adelantado. Cancelación gratuita antes del 30 de abril de 2026.
- Reservas: por Booking.com o directamente por WhatsApp/email
- Web: https://www.elsosiego.com/casa-rural.html

═══ EVENTOS Y CELEBRACIONES ═══
- Patio con carpa para celebraciones privadas: comidas familiares, cumpleaños, reuniones, etc.
- Tres menús disponibles (todos incluyen: 2 entrantes a elegir, tabla de carne o pescado, postre, café e infusiones, pan y agua):
  · TABLA CLÁSICA — 25€/persona: churrasco de ternera, pollo, secreto de cerdo, chuletas de cerdo, combinado (chorizo, morcilla, longaniza, panceta). Opción pescado: rodaballo a la brasa o salmón a la plancha.
  · TABLA EL SOSIEGO — 28€/persona: churrasco de ternera, pollo, secreto de cerdo, lomo de cerdo, entraña, combinado (chorizo, morcilla, longaniza, panceta). Opción pescado: rodaballo a la brasa o salmón a la plancha.
  · TABLA CHULETÓN PREMIUM — 30€/persona: chuletón de ternera ⭐, careta de cerdo, entrecot, secreto ibérico, chuleta de cordero, entraña, chorizo/morcilla/longaniza/panceta. Opción pescado: rodaballo a la brasa o salmón a la plancha.
- Las bebidas (vinos, cervezas, refrescos) se pagan aparte según carta.
- Reservas de eventos: SOLO por formulario en https://tally.so/r/wo8y61 (NUNCA por Booking)
- Web: https://www.elsosiego.com/eventos.html

═══ CONTACTO ═══
- WhatsApp: 694 268 895 (este número)
- Email: elsosiegomrll@gmail.com
- Instagram: @elsosiego.morella
- Ubicación: Morella, Castellón

═══ REGLAS IMPORTANTES ═══
1. Si no sabes algo con certeza (disponibilidad de fechas concretas, preguntas muy específicas sobre el evento), NO inventes. Di que lo consultarás con la familia y responderás en breve.
2. Para disponibilidad de fechas específicas, di siempre que lo consulten directamente.
3. Sé breve y claro. Máximo 3-4 párrafos por respuesta. Usa emojis con moderación (1-2 por mensaje).
4. Firma siempre como "El equipo de El Sosiego 🌿"
`;

// ── Clasificar si es pregunta simple o compleja ────────────
async function clasificarMensaje(texto) {
  const prompt = `Clasifica este mensaje de WhatsApp recibido por un negocio rural como SIMPLE o COMPLEJA.

SIMPLE: preguntas generales sobre qué es el negocio, precios, qué incluyen los menús, ubicación, mascotas, capacidad, cómo reservar, horarios generales.
COMPLEJA: disponibilidad de fechas concretas, negociación de precios, grupos muy grandes, peticiones muy especiales, quejas, situaciones delicadas, preguntas que requieren consultar el calendario o tomar decisiones.

Mensaje: "${texto}"

Responde SOLO con una palabra: SIMPLE o COMPLEJA`;

  const result = await model.generateContent(prompt);
  const clasificacion = result.response.text().trim().toUpperCase();
  return clasificacion.includes('SIMPLE') ? 'SIMPLE' : 'COMPLEJA';
}

// ── Generar respuesta automática ──────────────────────────
async function generarRespuesta(texto) {
  const prompt = `${CONTEXTO_SOSIEGO}

Mensaje del cliente: "${texto}"

Genera una respuesta natural, cálida y útil. Recuerda: eres el asistente de El Sosiego, no un robot.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── Formatear aviso para Diego ─────────────────────────────
function formatearAvisoParaDiego(mensaje, remitente, sugerencia) {
  return `🤖 *MENSAJE COMPLEJO — El Sosiego Bot*

📱 *De:* ${remitente}
💬 *Mensaje:* ${mensaje}

💡 *Sugerencia de respuesta:*
${sugerencia}

_Responde tú directamente a este contacto desde tu WhatsApp._`;
}

// ── Cliente WhatsApp ──────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
  }
});

client.on('qr', (qr) => {
  console.log('\n══════════════════════════════════');
  console.log('   Escanea este QR con tu móvil   ');
  console.log('══════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\n✅ Bot de El Sosiego conectado y listo');
  console.log(`📱 Número del bot: 694 268 895`);
  console.log(`🔔 Alertas complejas → ${TU_NUMERO}`);
  console.log('══════════════════════════════════\n');
});

client.on('auth_failure', () => {
  console.error('❌ Error de autenticación. Borra la carpeta /session y reinicia.');
});

client.on('message', async (msg) => {
  // Ignorar mensajes de grupos, estados y del propio bot
  if (msg.from.includes('@g.us')) return;
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;

  const texto    = msg.body?.trim();
  const remitente = msg.from;

  if (!texto) return;

  console.log(`\n📨 Mensaje de ${remitente}: "${texto}"`);

  try {
    const tipo = await clasificarMensaje(texto);
    console.log(`   → Clasificado como: ${tipo}`);

    if (tipo === 'SIMPLE') {
      // Responder automáticamente
      const respuesta = await generarRespuesta(texto);
      await msg.reply(respuesta);
      console.log(`   ✅ Respuesta automática enviada`);

    } else {
      // Avisar a Diego con sugerencia
      const sugerencia = await generarRespuesta(texto);

      // Enviar respuesta temporal al cliente
      await msg.reply(`Hola 👋 Gracias por contactar con El Sosiego. Tu consulta requiere nuestra atención personalizada. Te respondemos en breve 🌿

_El equipo de El Sosiego_`);

      // Enviar aviso a Diego
      if (TU_NUMERO) {
        const aviso = formatearAvisoParaDiego(texto, remitente, sugerencia);
        await client.sendMessage(TU_NUMERO, aviso);
        console.log(`   🔔 Aviso enviado a Diego`);
      }
    }

  } catch (error) {
    console.error('   ❌ Error procesando mensaje:', error.message);
  }
});

client.initialize();
