import { spawn } from 'child_process';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const inputImage = process.argv[2] ?? 'assets/atb-receipt_1.png';
const outputTextPath = process.argv[3] ?? 'receipt_text.txt';

const scriptPath = resolve(process.cwd(), 'src', 'ocr', 'ocr.py');
const imagePath = resolve(process.cwd(), inputImage);
const outputPath = resolve(process.cwd(), outputTextPath);

const env = {
  ...process.env,
  FLAGS_use_mkldnn: '0',
  FLAGS_enable_pir_api: '0',
  GLOG_minloglevel: '3',
  PYTHONIOENCODING: 'utf-8',
};

const pythonBin = resolve(process.cwd(), '.venv', 'Scripts', 'python.exe');
const python = spawn(pythonBin, [scriptPath, imagePath], { env });

let stdout = '';
let stderr = '';

python.stdout.on('data', (data: Buffer) => {
  stdout += data.toString('utf8');
});

python.stderr.on('data', (data: Buffer) => {
  stderr += data.toString('utf8');
});

python.on('close', (code) => {
  if (code !== 0) {
    console.error(stderr || `OCR process exited with code ${code}`);
    process.exitCode = code ?? 1;
    return;
  }

  const lines = stdout.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.includes('=== RECEIPT TEXT ==='));
  const endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.includes('=== RECEIPT TEXT END ==='),
  );

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    console.error('Could not find RECEIPT TEXT markers in OCR output.');
    process.exitCode = 1;
    return;
  }

  const extractedText = lines
    .slice(startIdx + 1, endIdx)
    .join('\n')
    .trim();

  // writeFileSync(outputPath, extractedText, { encoding: 'utf8' });
  console.log(extractedText);
});
