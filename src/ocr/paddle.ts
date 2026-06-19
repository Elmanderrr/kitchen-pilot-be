import { spawn } from 'child_process';
import { resolve as resolvePath } from 'path';

const imageArg = process.argv[2];

if (imageArg) {
  console.log('running OCR on image:', imageArg);
  runPyScript(imageArg, (text) => {
    console.log(text);
  });
}

export const ocr = (path: string) => {
  return new Promise<string>((resolve, reject) => {
    runPyScript(path, (text) => {
      resolve(text);
    });
  });
};

function runPyScript(path: string, cb?: (text) => void) {
  const scriptPath = resolvePath(process.cwd(), 'src', 'ocr', 'ocr.py');
  const imagePath = resolvePath(process.cwd(), path);
  const env = {
    ...process.env,
    FLAGS_use_mkldnn: '0',
    FLAGS_enable_pir_api: '0',
    GLOG_minloglevel: '3',
    PYTHONIOENCODING: 'utf-8',
  };

  const pythonBin =
    process.env.PYTHON_BIN ||
    resolvePath(process.cwd(), '.venv', 'Scripts', 'python.exe');

  if (!process.env.PYTHON_BIN) {
    console.log('using local py env');
  }

  if (!pythonBin) {
    console.error('PYTHON_BIN environment variable is not set');
    process.exitCode = 1;
    cb?.('');
  }

  const python = spawn(pythonBin, [scriptPath, imagePath], { env });

  let stdout = '';
  const stderr = '';

  python.stdout.on('data', (data: Buffer) => {
    console.log(data.toString('utf8'));
    stdout += data.toString('utf8');
  });

  python.on('close', (code) => {
    if (code !== 0) {
      const error = stderr || `OCR process exited with code ${code}`;
      console.error(error);
      cb?.(error);
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
    cb?.(extractedText);
  });
}
