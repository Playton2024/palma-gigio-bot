
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');

const token = process.env.TOKEN;
const bot = new TelegramBot(token);
const app = express();
app.use(bodyParser.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🌴 ¡Hola Gigio! Soy tu asistente de palma.

Puedes escribirme:
/resumen – para ver la producción
/pendientes – para saber qué está pendiente por pagar
/costos – para conocer los costos acumulados

Estoy listo para ayudarte 💪");
});

bot.onText(/\/resumen/, (msg) => {
  const chatId = msg.chat.id;
  const resumen = [];

  fs.createReadStream('data.csv')
    .pipe(csv())
    .on('data', (row) => {
      const lote = row['Lote'] || row['lote'];
      const peso = parseFloat(row['Peso total'] || row['peso total'] || '0');
      resumen.push({ lote, peso });
    })
    .on('end', () => {
      const resumenPorLote = resumen.reduce((acc, row) => {
        if (!acc[row.lote]) acc[row.lote] = 0;
        acc[row.lote] += row.peso;
        return acc;
      }, {});

      let mensaje = '🌾 *Producción acumulada*
Hola Gigio, esto es lo que llevas cosechado:
';
      let total = 0;

      for (const [lote, peso] of Object.entries(resumenPorLote)) {
        mensaje += `🧺 *${lote}:* ${peso.toLocaleString()} kg\n`;
        total += peso;
      }

      mensaje += `
📦 *Total cosechado:* ${total.toLocaleString()} kg\n¡Vamos bien este mes! 💪`;

      bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    });
});

bot.onText(/\/pendientes/, (msg) => {
  const chatId = msg.chat.id;
  const pendientes = [];

  fs.createReadStream('data.csv')
    .pipe(csv())
    .on('data', (row) => {
      if (row['Pagado'] && row['Pagado'].toLowerCase() === 'no') {
        pendientes.push({
          fecha: row['Fecha'],
          lote: row['Lote'],
          jornales: row['Jornales'],
          corte: row['Corte'],
          transporte: row['Transporte']
        });
      }
    })
    .on('end', () => {
      if (pendientes.length === 0) {
        bot.sendMessage(chatId, '✅ Todo está al día Gigio. No hay pagos pendientes.');
        return;
      }

      let mensaje = '💸 *Pagos pendientes por lote:*
';

      pendientes.forEach((p) => {
        mensaje += `
📅 ${p.fecha} – ${p.lote}
`;
        mensaje += `🔻 Jornales: $${parseInt(p.jornales).toLocaleString()}
`;
        mensaje += `🔻 Corte: $${parseInt(p.corte).toLocaleString()}
`;
        mensaje += `🔻 Transporte: $${parseInt(p.transporte).toLocaleString()}
`;
      });

      bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    });
});

bot.onText(/\/costos/, (msg) => {
  const chatId = msg.chat.id;
  const costosPorLote = {};

  fs.createReadStream('data.csv')
    .pipe(csv())
    .on('data', (row) => {
      const lote = row['Lote'];
      const jornales = parseInt(row['Jornales'] || '0');
      const corte = parseInt(row['Corte'] || '0');
      const transporte = parseInt(row['Transporte'] || '0');

      if (!costosPorLote[lote]) {
        costosPorLote[lote] = 0;
      }

      costosPorLote[lote] += jornales + corte + transporte;
    })
    .on('end', () => {
      let mensaje = '📊 *Costos acumulados por lote:*
Aquí están tus gastos acumulados, Gigio:
';
      let total = 0;

      for (const [lote, costo] of Object.entries(costosPorLote)) {
        mensaje += `📍 *${lote}:* $${costo.toLocaleString()}\n`;
        total += costo;
      }

      mensaje += `
💰 *Total general:* $${total.toLocaleString()}`;

      bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
