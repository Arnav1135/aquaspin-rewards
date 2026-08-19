import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = process.env.TARGET_URL || 'https://aquaspin-rewards.vercel.app/mini-games/water-sort';

async function runVisualQA() {
  console.log(`[AI Visual Critic] Starting headless QA session for ${TARGET_URL}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Mobile viewport for strict UI obstruction testing
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  
  try {
    console.log(`[AI Visual Critic] Navigating to target...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait an additional 3 seconds for 3D canvas and shaders to fully compile and render
    await new Promise(r => setTimeout(r, 3000));
    
    const screenshotPath = path.join(__dirname, 'latest_qa_screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[AI Visual Critic] Screenshot captured at ${screenshotPath}`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(`[AI Visual Critic] GEMINI_API_KEY is not set. Skipping AI analysis. Visual capture succeeded.`);
      return;
    }
    
    console.log(`[AI Visual Critic] Analyzing image via Gemini Vision API...`);
    
    const ai = new GoogleGenAI({ apiKey });
    
    const imageBuffer = fs.readFileSync(screenshotPath);
    
    const prompt = `
    You are an expert Game QA Automation Engineer and UI/UX Critic.
    Analyze this mobile screenshot of a React Three Fiber game (Water Sort 3D).
    
    1. Are the 3D game elements (the tubes and liquids) clearly visible?
    2. Is there any HTML UI overlay (like buttons, modals, or text) blocking the central game pieces?
    3. Are there any severe lighting/contrast blowouts or rendering artifacts visible?
    4. Provide a boolean PASS or FAIL overall rating.
    
    Return your response strictly in JSON format matching this schema:
    {
      "visible": boolean,
      "uiObstructed": boolean,
      "renderingArtifacts": boolean,
      "pass": boolean,
      "critique": "string"
    }
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: imageBuffer.toString('base64') } }
        ]}
      ]
    });
    
    const text = response.text;
    console.log(`[AI Visual Critic] Response received:`);
    console.log(text);
    
  } catch (error) {
    console.error(`[AI Visual Critic] Error during QA session:`, error);
  } finally {
    await browser.close();
  }
}

runVisualQA();
