const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const fs = require("fs");
require("dotenv").config();

const { collection, addDoc }  = require("firebase/firestore");

const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: "telegrambot-b4649",
    storageBucket: "telegrambot-b4649.appspot.com",
    messagingSenderId: "504761109009",
    appId: "1:504761109009:web:c4db89d8b106cd39f13fb0",
    measurementId: "G-RY79VLQGDR"
};

const apps = initializeApp(firebaseConfig);
const db = getFirestore(apps);


const app = express();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

const textOnly = async (reqBody) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `Imagine you are currently living Sri Lanka. I have a question to ask from you. I will attach it below. so think you are a 
    local tour guide and very polite and smiley person, answer the question as you consider you are a professional ture guide and you have great memory about 
    sri lankan history and well understanding the sri lankan culture and sociaty, religions and much more. so your anwser should be related to the question and give short and sweet anwser.
    Do not add greeting text to your reply. Also add declaimer about this is a AI generated replay  at the end of the response.
    My Question is :- ${reqBody}
    `;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
};


async function addUserToFirestore(userId,message,response) {
  const currentTime = new Date();

  let dbTable = "";
  if(userId == 6300187372){
    dbTable = "myData";
  }else{
    dbTable = "UsersTest";
  }
  const docRef = await addDoc(collection(db, dbTable), {
    userId: userId,
    message:message,
    response:response,
    datetime: currentTime
  });
  console.log("Document written with ID: ", docRef.id);
}


const  sendDataMiddleware = (chatId,ask,respose) => {
  addUserToFirestore(chatId,ask,respose);
}
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
          sendDataMiddleware(chatId,msg.text,text);
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
      sendDataMiddleware(chatId,msg.text,response);
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