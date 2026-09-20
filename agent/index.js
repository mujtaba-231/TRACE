import si from "systeminformation";
import activeWin from "active-win";
import os from "os";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

let previousApp = null;
let activityLogs = []; 
let appStartTime = Date.now();

// --- NEW: VS Code Title Parser ---
function extractDevContext(appName, windowTitle) {
    if (appName !== "Code" && appName !== "Visual Studio Code") {
        return { project: null, file: null };
    }
    
    // Remove the unsaved file bullet (●) if it exists
    const cleanTitle = windowTitle.replace(/^●\s*/, '');
    const parts = cleanTitle.split(' - ');
    
    // Format: "server.js - FBI-Personal-OS - Visual Studio Code"
    if (parts.length >= 3) {
        return { file: parts[0], project: parts[parts.length - 2] };
    } 
    // Format: "FBI-Personal-OS - Visual Studio Code"
    if (parts.length === 2) {
        return { file: null, project: parts[0] };
    }
    
    return { project: null, file: null };
}

async function getSystemInfo() {
    const cpu = await si.currentLoad();
    const memory = await si.mem();
    const disk = await si.fsSize();

    const ramPercent = (memory.active / memory.total) * 100;

    let activeApplication = "Unknown";
    let windowTitle = "Unknown";
    let currentProject = null;
    let currentFile = null;

    try {
        const window = await activeWin();
        if (window) {
            activeApplication = window.owner.name;
            windowTitle = window.title; 
            
            // --- NEW: Extract Project Data ---
            const devContext = extractDevContext(activeApplication, windowTitle);
            currentProject = devContext.project;
            currentFile = devContext.file;
        }
    } catch (error) {
        activeApplication = "Unable to detect";
    }

    if (activeApplication !== previousApp) {
        if (previousApp !== null) {
            const time = new Date().toLocaleTimeString();
            const durationMs = Date.now() - appStartTime;
            const totalSeconds = Math.floor(durationMs / 1000);
            
            activityLogs.unshift(`[${time}] Switch: ${previousApp} -> ${activeApplication} (${totalSeconds}s)`);
            if (activityLogs.length > 3) activityLogs.pop();

            socket.emit("activity_change", {
                timestamp: new Date().toISOString(),
                previousApp: previousApp,
                currentApp: activeApplication,
                durationSeconds: totalSeconds,
                // --- NEW: Send Dev Context to Server ---
                project: currentProject,
                file: currentFile
            });
        }
        appStartTime = Date.now();
    }
    
    previousApp = activeApplication;

    console.clear();
    console.log("==============================================");
    console.log("          NEXUS // DIGITAL TWIN");
    console.log("             AGENT v0.7");
    console.log("==============================================");
    console.log("CPU:   ", cpu.currentLoad.toFixed(2) + "%");
    console.log("RAM:   ", ramPercent.toFixed(2) + "%");
    console.log("\nACTIVE PROCESS");
    console.log("----------------------------------------------");
    console.log(activeApplication);
    console.log(`[${windowTitle}]`); 
    
    if (currentProject) {
        console.log(`\nINTELLIGENCE: Coding in ${currentProject} (${currentFile || 'Workspace'})`);
    }

    // Transmit telemetry to the server
    socket.emit("telemetry", {
        computer: os.hostname(),
        cpu: Number(cpu.currentLoad.toFixed(2)),
        ram: Number(ramPercent.toFixed(2)),
        activeApp: activeApplication,
        windowTitle: windowTitle,
        project: currentProject,
        file: currentFile,
        timestamp: new Date().toISOString()
    });
}

async function startAgent() {
    console.log("Starting Telemetry Agent...");
    await getSystemInfo();
    setInterval(async () => {
        await getSystemInfo();
    }, 2000);
}

startAgent();