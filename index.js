const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const http = require('http');

const TU_NUMERO = process.env.TU_NUMERO;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let qrActual = null;

// ── Atención humana y memoria de conversaciones ───────────
const atencionHumana = new Set(); // números pausados (cualquier formato)
const historialChat = new Map();  // historial por contacto

const MAX_HISTORIAL = 10; // últimos 10 mensajes por contacto

function extraerNumero(id) {
  return id.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '').trim();
}

function estaEnAtencion(from) {
  const num = extraerNumero(from);
  // Comprueba si algún valor en el Set es substring del ID o viceversa
  for (const pausado of atencionHumana) {
    if (num.includes(pausado) || pausado.includes(num) || from.includes(pausado)) {
      return true;
    }
  }
  return false;
}

function agregarAlHistorial(contacto, rol, contenido) {
  if (!historialChat.has(contacto)) {
    historialChat.set(contacto, []);
  }
  const historial = historialChat.get(contacto);
  historial.push({ role: rol, content: contenido });
  // Mantener solo los últimos MAX_HISTORIAL mensajes
  if (historial.length > MAX_HISTORIAL) {
    historial.splice(0, historial.length - MAX_HISTORIAL);
  }
}

function obtenerHistorial(contacto) {
  return historialChat.get(contacto) || [];
}

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
Eres el asistente de WhatsApp de El Sosiego, negocio familiar en Morella (Castellón) con más de 20 años de historia.

TONO: Cercano, directo y cálido. Como un familiar que atiende. Respuestas CORTAS (máximo 3-4 líneas). Sin párrafos largos. Sin florituras. 1-2 emojis máximo. Nada de "¡Claro que sí!" ni frases vacías de relleno.

AUTONOMÍA: Confía en ti mismo. Si tienes la información, respóndela directamente. Solo escala a una persona real cuando la pregunta sea genuinamente imposible de responder (disponibilidad de fechas concretas, negociación de precios, quejas, paellas a domicilio). Para todo lo demás, responde tú con la información del contexto.

MEMORIA: Tienes acceso al historial de la conversación. Úsalo para dar respuestas coherentes y no repetir información ya dada. Si el cliente ya te dijo cuántas personas son o qué servicio busca, recuérdalo.

RECOMENDACIONES DE MENÚ: Si alguien pide recomendación, recomienda siempre la TABLA CHULETÓN PREMIUM (30€/persona). Argumento: por solo 2€ más que El Sosiego incluye cortes premium como chuletón de ternera, secreto ibérico, chuleta de cordero y entrecot. Da igual cuántas personas sean.

SIEMPRE menciona la web al final: https://elsosiego.netlify.app
NUNCA digas "contáctanos por WhatsApp" — ya están aquí.
Firma siempre: El equipo de El Sosiego 🌿

══════════════════════════════════
EL NEGOCIO TIENE TRES SERVICIOS:
══════════════════════════════════

━━━ 1. CASA RURAL ━━━
Alquiler exclusivo de toda la casa (nadie más se aloja).
Web: https://elsosiego.netlify.app/casa-rural.html

- 4 dormitorios:
  · Hab.1: cama doble 150cm, vistas al jardín
  · Hab.2: cama doble 150cm, vistas a Morella
  · Hab.3: 2 camas individuales (ideal niños)
  · Hab.4: 2 camas individuales o convertible en doble, baño en suite
- Capacidad: hasta 9 personas. Superficie: 4.000 m²
- Incluye: piscina privada exclusiva, terraza con vistas a la muralla medieval, parrilla/barbacoa, jardín
- Mascotas: admitidas con cariño
- Impuestos incluidos. Sin pago por adelantado.
- Cancelación gratuita antes del 30 de abril de 2026

PRECIOS POR NOCHE (toda la casa, no por persona):
  2 personas → 150€ / 3 personas → 225€ / 4 personas → 240€
  5 personas → 260€ / 6 personas → 295€ / 8 personas → 299€ / 9 personas → 300€

Reservas: Booking.com o directamente por WhatsApp/email

━━━ 2. EVENTOS Y CELEBRACIONES ━━━
Patio con carpa para celebraciones privadas.
Web: https://elsosiego.netlify.app/eventos.html
Reservas SOLO por formulario: https://tally.so/r/wo8y61 (NUNCA por Booking)

MENÚS (todos incluyen: 2 entrantes, tabla de carne o pescado, postre, café, pan y agua):

· TABLA CLÁSICA — 25€/persona
  Carne: churrasco de ternera, pollo, secreto de cerdo, chuletas de cerdo, combinado embutidos
  Pescado: rodaballo a la brasa o salmón a la plancha

· TABLA EL SOSIEGO — 28€/persona
  Carne: churrasco, pollo, secreto, lomo de cerdo, entraña, combinado embutidos
  Pescado: rodaballo a la brasa o salmón a la plancha

· TABLA CHULETÓN PREMIUM — 30€/persona ⭐ RECOMENDADA
  Carne: chuletón de ternera, careta, entrecot, secreto ibérico, chuleta de cordero, entraña, embutidos
  Pescado: rodaballo a la brasa o salmón a la plancha
  → Por solo 2€ más que El Sosiego, incluye cortes premium que marcan la diferencia.

Bebidas aparte según carta.

CUANDO EL CLIENTE QUIERA RESERVAR UN EVENTO, manda siempre este mensaje exacto:

"Para formalizar la reserva, rellena este formulario 👇
https://tally.so/r/wo8y61

Es muy sencillo, solo 3 pasos:
1️⃣ Elige 2 entrantes de los disponibles
2️⃣ Elige el menú (Clásica, El Sosiego o Premium) y el vino
3️⃣ Déjanos tus datos de contacto y la fecha

En cuanto lo recibamos nos ponemos en contacto contigo 🌿"

━━━ 3. PAELLAS A DOMICILIO ━━━
Ofrecemos servicio de paellas a domicilio. Cuando alguien pregunte por este servicio, responde con interés y calidez, diles que es un servicio que ofrecemos y que en breve alguien del equipo se pondrá en contacto para confirmar disponibilidad y presupuesto. NO escales a persona real — responde tú directamente con este mensaje y punto.

━━━ CARTA ━━━
Web: https://elsosiego.netlify.app/carta.html

ENTRANTES:
- Ensalada de la Huerta: 11,50€ / Embutidos del Maestrazgo: 8,50€ / Pan con Tomate: 2,50€
- Croquetas Morellanas (unidad): 2,50€ / Pimientos del Piquillo: 10€ / Parrillada de Verduras: 12€
- Gambas al Ajillo: 8€ / Codorniz en Escabeche: 12€ / Tostas con Sobrasada Trufada: 7,50€

CARNE A LA BRASA:
- Chuletón de Ternera Madurada 500g: 25€ / Chuletón 1kg: 23€ / Entrecot 500g: 17€

CARTA ESPECIAL:
- Tabla carne y verdura ~6 personas: 150€ / Tabla completa ~10 personas: 250€
- Paella de carne (mín. 6 personas): 60€ / Rodaballo a la brasa ~3 personas: 50€

CAFETERÍA:
- Café: 1,50€ / Cortado: 1,70€ / Café con Leche: 1,90€ / Carajillo Quemado: 2,50€
- Infusiones: 1,50€ / Zumos: 2€ / Churros: 2€ / Flaons: 2€ / Bizcocho: 1,80€ / Tostado con Jamón: 3,50€

BODEGA:
Vino de la Casa: Valdes Tinto 10€ / Valdes Blanco 10€
Tintos: Cune crianza 16€, Ramón Bilbao crianza 16€, Lann crianza 16€, Azpilicueta crianza 20€, Muga crianza 25€, Protos 18€, Pago de Capellanes 25€, Valmayor Garnacha 12€
Blancos: Ramón Bilbao 14€, Cantarranas 12€, Valmayor Garnacha 12€
Albariños: Martín Godax 18€, Mar de Fredes 19€
Bebidas: Refresco 2€ / Agua 1,5l 1,50€ / Cerveza 2€ / Champán: consultar

━━━ CONTACTO ━━━
WhatsApp: 694 268 895 / Email: elsosiegomrll@gmail.com
Instagram: @elsosiego.morella / Ubicación: Morella, Castellón
Web: https://elsosiego.netlify.app
`;

// ── Funciones IA ──────────────────────────────────────────
async function clasificarMensaje(texto) {
  const r = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: `Clasifica este mensaje de WhatsApp como SIMPLE o COMPLEJA.

SIMPLE (responde el bot): precios, menús, carta, vinos, qué es el negocio, ubicación, mascotas, capacidad, cómo reservar eventos, recomendaciones de menú, entrantes, bebidas, cafetería, paellas a domicilio, cualquier info general del contexto.

COMPLEJA (necesita persona real): disponibilidad de fechas concretas para casa rural, negociación de precios, quejas, peticiones muy especiales no cubiertas por el contexto.

En caso de duda, clasifica como SIMPLE.

Mensaje: "${texto}"
Responde SOLO con una palabra: SIMPLE o COMPLEJA` }],
    max_tokens: 10,
  });
  const res = r.choices[0].message.content.trim().toUpperCase();
  return res.includes('SIMPLE') ? 'SIMPLE' : 'COMPLEJA';
}

async function generarRespuesta(contacto, textoNuevo) {
  const historial = obtenerHistorial(contacto);
  const r = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: CONTEXTO_SOSIEGO },
      ...historial,
      { role: 'user', content: textoNuevo }
    ],
    max_tokens: 300,
  });
  return r.choices[0].message.content.trim();
}

// ── Procesar comandos de control ──────────────────────────
async function procesarComando(msg) {
  const texto = msg.body?.trim().toLowerCase();
  if (!texto) return false;

  const matchParar = texto.match(/^#parar\s+(\S+)/);
  if (matchParar) {
    const id = matchParar[1];
    atencionHumana.add(id);
    await msg.reply(`✅ Bot pausado para ${id}.\nEscribe #reanudar ${id} para reactivarlo.\n\nPausados ahora: ${atencionHumana.size}`);
    console.log(`🤝 Pausado: ${id}. Lista completa: ${[...atencionHumana].join(', ')}`);
    return true;
  }

  const matchReanudar = texto.match(/^#reanudar\s+(\S+)/);
  if (matchReanudar) {
    const id = matchReanudar[1];
    atencionHumana.delete(id);
    await msg.reply(`✅ Bot reactivado para ${id}.`);
    console.log(`🤖 Reactivado: ${id}. Lista: ${[...atencionHumana].join(', ')}`);
    return true;
  }

  if (texto === '#lista') {
    if (atencionHumana.size === 0) {
      await msg.reply('📋 No hay ningún contacto pausado.');
    } else {
      await msg.reply(`📋 Contactos pausados:\n${[...atencionHumana].join('\n')}`);
    }
    return true;
  }

  return false;
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
  console.log('💡 Comandos: #parar ID / #reanudar ID / #lista');
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

  // Comprobar si es un comando
  const esComando = await procesarComando(msg);
  if (esComando) return;

  // Comprobar si está pausado — usando el from completo y el número limpio
  const numeroLimpio = extraerNumero(msg.from);
  if (estaEnAtencion(msg.from)) {
    console.log(`⏭️ Ignorado (atención humana): ${msg.from}`);
    return;
  }

  console.log(`📨 [${numeroLimpio}]: "${texto}"`);

  try {
    const tipo = await clasificarMensaje(texto);
    console.log(`   → ${tipo}`);

    if (tipo === 'SIMPLE') {
      // Guardar mensaje del cliente en historial
      agregarAlHistorial(msg.from, 'user', texto);
      const respuesta = await generarRespuesta(msg.from, texto);
      // Guardar respuesta del bot en historial
      agregarAlHistorial(msg.from, 'assistant', respuesta);
      await msg.reply(respuesta);
      console.log('   ✅ Enviado');
    } else {
      await msg.reply(`Hola 👋 En breve te atenderá alguien del equipo directamente.\n\n_El equipo de El Sosiego 🌿_`);
      if (TU_NUMERO) {
        const sugerencia = await generarRespuesta(msg.from, texto);
        const aviso = `🤖 *MENSAJE COMPLEJO*\n\n📱 *ID del contacto:* ${msg.from}\n💬 *Mensaje:* ${texto}\n\n💡 *Sugerencia:*\n${sugerencia}\n\n_Para tomar el control escribe:_\n#parar ${numeroLimpio}`;
        await client.sendMessage(TU_NUMERO, aviso);
        console.log('   🔔 Aviso enviado a Diego');
      }
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
});

client.initialize();
