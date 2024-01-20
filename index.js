const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const fs = require("fs");

const app = express();

const token = "6967992028:AAHin0HAu58uwWIGTAwYEOLETMHL7Ba3e_o";
const bot = new TelegramBot(token, { polling: true });

const genAI = new GoogleGenerativeAI("AIzaSyBBk40GdC4cwITxkCsgT8vdChRpOUMFNGM");

const textOnly = async (reqBody) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `Imagine you are currently living Sri Lanka. I have a question to ask from you. I will attach it below. so think you are a 
    local tour guide and very polite and smiley person, answer the question as you consider you are a professional ture guide and you have great memory about 
    sri lankan history and well understanding the sri lankan culture and sociaty, religions and much more. so your anwser should be related to the question and give short and sweet anwser.
    Do not add greeting text to your reply
    My Question is :- ${reqBody}
    `;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
};


app.get('/', (req, res) => {
  res.send('Hello, Express!');
});
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  try {
    let response = "";

    if (msg.photo) {

      bot.sendChatAction(chatId, "typing");

      const photoId = msg.photo[msg.photo.length - 1].file_id;

      bot.getFile(photoId).then(async (fileInfo) => {

        const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const prompt = `Imagine you are currently living Sri Lanka. I have a question to ask from you. I will attach it below. so think you are a 
        local tour guide and very polite and smiley person, answer the question as you consider you are a professional ture guide and you have great memory about 
        sri lankan history and well understanding the sri lankan culture and sociaty, religions and much more. so your anwser should be related to the question and give short and sweet anwser.
        Do not add greeting text to your reply
        My Question is :- ${msg.text}
        `;

        convertImageToBase64(fileUrl, async function  (base64Data) {
          console.log('Base64 representation:', base64Data);
          const image = {
            inlineData: {
              data: base64Data,
              mimeType: "image/png",
            },
          };
          const result = await model.generateContent([prompt, image]);
          const text = result.response.text();
          if (msg.chat.type === "private") {
            bot.sendMessage(chatId, `${text}`);
          } else if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
            bot.sendMessage( chatId, `Hello, group members! Someone said: ${text}` );
          }
        });
      });

    } else {
      bot.sendChatAction(chatId, "typing");
      response = await textOnly(msg.text);
      if (msg.chat.type === "private") {
        bot.sendMessage(chatId, `${response}`);
      } else if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
        bot.sendMessage( chatId, `Hello, group members! Someone said: ${msg.text}` );
      }
    }


  } catch (error) {
    console.error("Error fetching data:", error.message);
    bot.sendMessage(chatId, "An error occurred while processing your request.");
  }
});

async function convertImageToBase64(url, callback) {
  try {
    // Fetch the image
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    // Convert the image buffer to base64
    const base64Data = Buffer.from(response.data, 'binary').toString('base64');

    // Callback with the base64 data
    callback(base64Data);
  } catch (error) {
    console.error('Error fetching or converting the image:', error.message);
  }
}
// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});