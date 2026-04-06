const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const filePath = `file://${path.resolve('index.html')}`;
  await page.goto(filePath, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: 'dawid-ciupka-cv.pdf',
    format: 'A4',
    margin: { top: '1.8cm', right: '2cm', bottom: '1.8cm', left: '2cm' },
    printBackground: true,
    displayHeaderFooter: false,
  });

  await browser.close();
  console.log('PDF generated: dawid-ciupka-cv.pdf');
})();
