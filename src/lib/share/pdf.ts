import { existsSync } from "node:fs";
import { selfFetchHeaders } from "./urls";

// Prints the reader page itself (with ?print=1, which strips the controls)
// through headless Chromium, so the PDF shares every token, font, and rule
// with the HTML. On Vercel the browser comes from @sparticuz/chromium; on a
// laptop it is whatever Chrome is installed (or PUPPETEER_EXECUTABLE_PATH).
const LOCAL_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

async function launch() {
  const puppeteer = await import("puppeteer-core");
  const onVercel = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (onVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? LOCAL_CHROME.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error(
      "No local Chrome found. Set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary.",
    );
  }
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

/** Render the print view of `pageUrl` to a PDF buffer. */
export async function renderPdf(pageUrl: string): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders(selfFetchHeaders());
    await page.emulateMediaType("print");
    await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.evaluateHandle("document.fonts.ready");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "18mm", right: "16mm", bottom: "20mm", left: "16mm" },
    });
  } finally {
    await browser.close();
  }
}
