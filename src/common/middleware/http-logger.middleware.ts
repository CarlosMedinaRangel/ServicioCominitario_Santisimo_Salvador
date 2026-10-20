import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      const message = `${method} ${originalUrl} ${statusCode} +${duration}ms [${contentLength}b - IP: ${ip}]`;

      if (statusCode >= 500) {
        console.error(`\x1b[31m[HTTP] ❌ ${message}\x1b[0m`);
      } else if (statusCode >= 400) {
        console.warn(`\x1b[33m[HTTP] ⚠️  ${message}\x1b[0m`);
      } else {
        console.log(`\x1b[32m[HTTP] ✅ ${message}\x1b[0m`);
      }
    });

    next();
  }
}
