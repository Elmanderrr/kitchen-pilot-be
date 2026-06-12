import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { createWorker } from 'tesseract.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('ri')
  getHello(): Promise<{ text: string }> {
    return createWorker('ukr').then((worker) => {
      return worker
        .recognize(
          'https://i.postimg.cc/Y2vZwq0K/ee6b9a40-b627-4a22-8492-c58daca5725e.png',
        )
        .then((ret) => {
          return worker.terminate().then(() => ({
            text: ret.data.text,
          }));
        });
    });
  }
}
