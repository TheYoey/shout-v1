require("dotenv").config({ path: __dirname + "/.env" });

console.log("📌 ENV File Path:", __dirname + "/.env");
console.log("🔍 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🔍 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "Loaded" : "Missing!");

const express = require("express");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Check if ENV variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.ASSEMBLYAI_API_KEY) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

// ✅ Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ✅ AssemblyAI Configuration
const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: process.env.ASSEMBLYAI_API_KEY,
    "content-type": "application/json",
  },
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-api.html'));
});

// ✅ Get Supabase credentials
app.get("/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  });
});

// ✅ Audio Processing Endpoint
app.post("/process", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No audio file uploaded.");
    console.log("🎙️ Received audio file, uploading to AssemblyAI...");

    // Upload to AssemblyAI with correct headers
    const uploadResponse = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      req.file.buffer,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
          "content-type": req.file.mimetype,
        },
      }
    );
    
    if (!uploadResponse.data.upload_url) {
      throw new Error("Failed to get upload URL from AssemblyAI");
    }
    
    console.log("✅ Audio uploaded successfully.");

    // Start transcription with more options
    const transcription = await assembly.post("/transcript", {
      audio_url: uploadResponse.data.upload_url,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
      boost_param: "high",
      language_code: "en",
    });

    if (!transcription.data.id) {
      throw new Error("Failed to start transcription");
    }

    console.log(`🔄 Transcription started: ${transcription.data.id}`);

    // Return the transcript ID immediately
    res.json({ 
      message: "Transcription started", 
      transcript_id: transcription.data.id 
    });

  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Processing failed", 
      details: error.response?.data?.error || error.message 
    });
  }
});

// ✅ Get Transcription Status
app.get("/transcript/:id", async (req, res) => {
  try {
    const transcriptResult = await assembly.get(`/transcript/${req.params.id}`);
    
    if (transcriptResult.data.status === "completed") {
      // Save to Supabase when completed
      const { data, error } = await supabase.from("transcripts").insert([{ 
        text: transcriptResult.data.text,
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw new Error(`Supabase error: ${error.message}`);
      
      res.json({
        status: "completed",
        text: transcriptResult.data.text
      });
    } else if (transcriptResult.data.status === "error") {
      res.json({
        status: "error",
        error: transcriptResult.data.error
      });
    } else {
      // Include progress information
      res.json({
        status: "processing",
        progress: transcriptResult.data.percent_completed || 0,
        words_processed: transcriptResult.data.words_processed || 0
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to get transcription status", 
      details: error.response?.data?.error || error.message 
    });
  }
});

// ✅ Webhook Handler for AssemblyAI
app.post("/webhook", async (req, res) => {
  try {
    const { transcript_id, status } = req.body;
    if (status === "completed") {
      console.log(`📥 Webhook: Transcription ${transcript_id} completed.`);

      // Retrieve the transcript
      const transcriptResult = await assembly.get(`/transcript/${transcript_id}`);

      // Save to Supabase
      await supabase.from("transcripts").insert([{ text: transcriptResult.data.text }]);

      console.log(`✅ Webhook: Transcript ${transcript_id} saved.`);
    }
    res.send("Webhook received");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

// ✅ Server Setup
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
