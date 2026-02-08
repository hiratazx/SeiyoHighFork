import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { listModels, chat, checkConnection, OllamaMessage } from './ollama.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1024,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        backgroundColor: '#1a1a2e',
        show: false,
    });

    // Load the app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers for Ollama
ipcMain.handle('ollama:list-models', async () => {
    try {
        const models = await listModels();
        return { success: true, models };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ollama:check-connection', async () => {
    try {
        const connected = await checkConnection();
        return { success: true, connected };
    } catch (error: any) {
        return { success: false, connected: false, error: error.message };
    }
});

ipcMain.handle('ollama:chat', async (_event, { model, messages, system }: {
    model: string;
    messages: OllamaMessage[];
    system?: string
}) => {
    try {
        const response = await chat(model, messages, system);
        return { success: true, response };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ollama:chat-stream', async (event, { model, messages, system }: {
    model: string;
    messages: OllamaMessage[];
    system?: string
}) => {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                system,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.message?.content) {
                        fullResponse += data.message.content;
                        // Send chunk to renderer
                        event.sender.send('ollama:stream-chunk', data.message.content);
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }

        return { success: true, response: fullResponse };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
