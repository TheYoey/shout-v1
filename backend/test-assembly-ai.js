// test-assemblyai.js
const axios = require('axios');
require('dotenv').config();

const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: process.env.ASSEMBLYAI_API_KEY,
    "content-type": "application/json",
  },
});

async function testAssemblyAI() {
  try {
    const response = await assembly.get('/account');
    console.log('AssemblyAI Account Info:', response.data);
    console.log('API Key is valid!');
  } catch (error) {
    console.error('AssemblyAI API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAssemblyAI();