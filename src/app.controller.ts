import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ocr } from './ocr/paddle';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('test')
  getHello(): Promise<{ text: string }> {
    return ocr('../../assets/1.png').then((text: string) => {
      return { text: 'test' };
    });
  }
}
