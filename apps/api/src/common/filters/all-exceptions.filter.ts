import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InvalidTransitionError } from '../state-machine/order-state-machine';
import { InvalidReturnTransition } from '../../modules/returns/return-state';
import { InvalidShipmentTransition } from '../../modules/shipments/shipment-state';

/** Yagona xato formati. Ichki tafsilotlar mijozga chiqmaydi. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ichki xatolik yuz berdi';
    let code = 'INTERNAL_ERROR';

    // Jo'natma va qaytarish holat mashinalari ham 409 beradi: bu
    // "ichki xato" emas, ruxsat etilmagan o'tish.
    if (
      exception instanceof InvalidTransitionError ||
      exception instanceof InvalidReturnTransition ||
      exception instanceof InvalidShipmentTransition
    ) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      code = 'INVALID_TRANSITION';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      code = (body as { code?: string }).code ?? httpCode(status);
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function httpCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'ERROR';
  }
}
