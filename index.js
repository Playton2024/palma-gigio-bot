
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');

// Obtener el token desde variables de entorno
const token = process.env.TOKEN;
const bot = new TelegramBot(token);
const app = express();

app.use(bodyParser.json());

// Ruta webhook para recibir mensajes de Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Hola Gigio, soy tu asistente de palma. Escribe /resumen para ver la producción.");
});

// Comando /resumen
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

      let mensaje = '📊 *Resumen de Producción – Julio*\n';
      let total = 0;

      for (const [lote, peso] of Object.entries(resumenPorLote)) {
        mensaje += `✔️ ${lote}: ${peso.toFixed(2)} kg\n`;
        total += peso;
      }

      mensaje += `💼 *Total:* ${total.toFixed(2)} kg`;

      bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    });
});

// Lanzar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
