import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import Groq from 'groq-sdk';

// Initialize Server & Middleware
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://imujtabadar_db_user:0PJtrUByXnIT9i6u@cluster0.lzs4dr8.mongodb.net/?appName=Cluster0')
    .then(() => console.log('📂 MongoDB Connected: fbi_os database'))
    .catch(err => console.error('MongoDB connection error:', err));

// Activity Schema
const activitySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    previousApp: String,
    currentApp: String,
    durationSeconds: Number,
    project: String,
    file: String
});

const Activity = mongoose.model('Activity', activitySchema);

// --- AI INVESTIGATOR ENDPOINT ---
app.get('/api/investigate', async (req, res) => {
    try {
        console.log("⚡ Groq Investigation triggered...");
        const recentLogs = await Activity.find().sort({ timestamp: -1 }).limit(20);
        
        const logString = recentLogs.map(log => 
            `[${new Date(log.timestamp).toLocaleTimeString()}] Switched from ${log.previousApp} to ${log.currentApp} for ${log.durationSeconds}s. ${log.project ? `(Project: ${log.project})` : ''}`
        ).join('\n');

        const prompt = `
        You are an AI Productivity Investigator analyzing a developer's digital twin logs. 
        Here are their last 20 context switches:
        ${logString}
        
        Analyze their behavior. Are they focused? Are they getting distracted? 
        Give a brief, witty, 2-sentence assessment of their current workflow.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "openai/gpt-oss-20b", 
        });

        const analysis = chatCompletion.choices[0]?.message?.content || "Analysis failed.";

        res.json({ analysis });
    } catch (error) {
        console.error("AI Investigation failed:", error);
        res.status(500).json({ error: "Investigation failed" });
    }
});

// Handle WebSockets
io.on('connection', async (socket) => {
    console.log('🟢 FBI Agent/Dashboard Connected:', socket.id);

    try {
        const history = await Activity.find().sort({ timestamp: -1 }).limit(10);
        socket.emit('activity_history', history);
    } catch (error) {
        console.error("Failed to fetch history:", error);
    }

    socket.on('telemetry', (data) => {
        io.emit('dashboard_update', data); 
    });

    socket.on('activity_change', async (data) => {
        try {
            const newActivity = await Activity.create({
                timestamp: data.timestamp,
                previousApp: data.previousApp,
                currentApp: data.currentApp,
                durationSeconds: data.durationSeconds,
                project: data.project,
                file: data.file
            });

            console.log(`[LOGGED] ${data.previousApp} -> ${data.durationSeconds}s ${data.project ? `(Project: ${data.project})` : ''}`);
            io.emit('new_activity', newActivity);
        } catch (error) {
            console.error("Failed to save activity:", error);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Disconnected');
    });
});

// Start Server
server.listen(3000, () => {
    console.log('FBI Command Center active on port 3000');
});