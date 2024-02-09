const express = require('express');
const bodyParser = require('body-parser');
const { Translate } = require('@google-cloud/translate').v2;
const { SpeechClient } = require('@google-cloud/speech').v1p1beta1;
const vision = require('@google-cloud/vision');
const path = require('path');
const multer = require('multer');
const app = express();
const port = 3000;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
require('dotenv').config();
// Set up WebSocket connection event handlers
wss.on('connection', function connection(ws) {
  console.log('Client connected');

  // Example: Send a log message to the client every second
  const interval = setInterval(() => {
    const logMessage = `Log message ${new Date().toISOString()}`;
    ws.send(logMessage);
  }, 1000);

  // Close WebSocket connection when the client disconnects
  ws.on('close', function close() {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

const CREDENTIALS = process.env.ENV_VARIABLE;

const CONFIG = {
    credentials: CREDENTIALS
};
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve images folder

// Hardcoded Google Cloud Translation API credentials
const translate = new Translate({
    projectId: 'your-project-id',
    credentials: CREDENTIALS
});

// Hardcoded Google Cloud Speech-to-Text API credentials
const speechClient = new SpeechClient({
    projectId: 'your-project-id',
    credentials: CREDENTIALS
});

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
const client = new vision.ImageAnnotatorClient(CONFIG);

//const detectLandmark = async (file_path) => {
  //  let [result] = await client.landmarkDetection(file_path);
    //console.log(result.landmarkAnnotations[0].description);
//};
const upload = multer({ dest: 'uploads/' }); // Specify the destination folder for uploaded files

// Define your route handler for processing images
// Inside your route handler for processing images

const detectText = async (file_path) => {
    let [result] = await client.textDetection(file_path);
    const descriptions = result.textAnnotations.map(annotation => annotation.description);
    console.log("detected text:",descriptions[0]);
};


// Translate text route
app.post('/process-image', upload.single('image'), async (req, res) => {
    try {
        const filePath = req.file.path; // Path to the uploaded image file

        // Call your vision API function with filePath
        const variable = await detectText(filePath); // Assuming detectText returns the variable

        res.json({ variable: variable }); // Sending the variable in the response
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing the image.' });
    }
});
// Translate text route
app.post('/translate', async (req, res) => {
    const { text, sourceLanguage, targetLanguage } = req.body;

    try {
        const [translation] = await translate.translate(text, { from: sourceLanguage, to: targetLanguage });
        
        // Map translated text to corresponding image and price
        let imageUrl, price;
        switch (translation.toLowerCase().replace(/\s/g, '')) {
            case 'glasses':
            case 'Chasma':    
            case 'चष्मा':
            case 'चश्मा':
            case 'ચશ્મો':
            case 'ચશ્મા':
            case 'चस्मा':       
                imageUrl = 'https://silly-florentine-76589e.netlify.app/glasses.jpg';
                price = '₹1670';
                break;
            case 'shirt':
            case 'कमीज':
            case 'શર્ટ':
            case 'शर्ट':    
                imageUrl = '/images/shirt.jpeg';
                price = '₹1000';
                break;
            case 'clock':    
            case 'watch':
            case 'घड़ी':
            case 'ઘડિયાળ':
            case 'ઘડિયાલ':
            case "घड्याळ":    
            case 'વોચ':    
            case 'ghadi':
            case 'ghadial':
                imageUrl = 'https://images.pexels.com/photos/2113994/pexels-photo-2113994.jpeg?cs=srgb&dl=pexels-joey-nguy%E1%BB%85n-2113994.jpg&fm=jpg';
                price = '₹1250';
                break;
            default:
                imageUrl = null;
                price = null;
                break;
        }

        res.json({ translatedText: translation, imageUrl, price });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while translating the text.' });
    }
});


app.post('/detect-text', (req, res) => {
    const { file_path } = req.body;
    detectText(file_path)
      .then((text) => {
        console.log('Detected text:', text); // Log the detected text to the console
        res.json({ detectedText: text }); // Send the detected text back to the frontend
      })
      .catch((error) => {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while detecting the text.' });
      });
  });
// Speech-to-text route
app.post('/speech-to-text', async (req, res) => {
    const { transcription } = req.body;

    try {
        // Perform language detection
        const [detection] = await translate.detect(transcription);
        const detectedLanguage = detection.language;

        // Translate to English
        const [translation] = await translate.translate(transcription, 'en');


        // Transcribe and translate the text
        const [response] = await speechClient.recognize({
            audio: { content: Buffer.from(transcription, 'utf8') },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: detectedLanguage, // Use detected language code for transcription
            },
        });

        const transcribedText = response.results.map(result => result.alternatives[0].transcript).join('\n');
        const translatedText = translation;

        res.json({ transcribedText, translatedText });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while transcribing and translating the audio.' });
    }
});
function sendLogMessage(message) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            // Check if the message starts with a timestamp pattern
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(message)) {
                client.send(message);
            }
        }
    });
}

wss.on('connection', function connection(ws) {
    console.log('Client connected');
  
    // Close WebSocket connection when the client disconnects
    ws.on('close', function close() {
        console.log('Client disconnected');
    });
});

const originalConsoleLog = console.log;

// Regular expression to match timestamp pattern (YYYY-MM-DDTHH:MM:SS.MSSZ)
const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

console.log = function () {
    if (typeof arguments[0] === 'string' && timestampRegex.test(arguments[0])) {
        // Exclude log messages starting with a timestamp
        return;
    }

    const logMessage = Array.from(arguments).join(' '); // Concatenate all arguments into a single log message
    sendLogMessage(logMessage); // Send log message to connected WebSocket clients
    originalConsoleLog.apply(console, arguments); // Call original console.log
};


  
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
