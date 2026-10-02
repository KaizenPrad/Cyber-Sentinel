// This file is the server entry point. It is responsible for:
// Loading environment variables from your .env file
// Importing the Express app
// Starting the server on the correct port
// It is the first file that runs when you start the backend.

import 'dotenv/config';
// This line loads your .env file so process.env values are available.

import app from './src/app.js';
// This imports the Express app you built in src/app.js.

import { env } from './src/config/env.js';
// This imports your validated environment settings like port and nodeEnv.

app.listen(env.port, ()=>{ // this line starts the server and listens on your port
    console.log(`CyberSentinal API running on: ${env.port} (${env.nodeEnv})`); // this line prints which PORT and ENV is running either development or production
}) // this line closes the listen call
// Here the app is running it tell which PORT and ENV is running either or development or production

//cs_live_8bbebKmc74B6YQE5MPwixQ8fVYcKovSd