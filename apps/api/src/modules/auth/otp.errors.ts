import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyOtpException extends HttpException {
  constructor(message: string, retryAfterSeconds?: number) {
    super({ code: 'OTP_RATE_LIMITED', message, retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
