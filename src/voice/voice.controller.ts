import { Body, Controller, Post } from '@nestjs/common';

@Controller('voice')
export class VoiceController {
  @Post('phonecall')
  handlePhoneCall(@Body() data: any) {
    console.log('Phone call data', '\n --------\n');
    console.log(data);
  }
}
