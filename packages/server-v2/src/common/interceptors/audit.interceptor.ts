import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const userId = request.user?.id || 'anonymous';
        const method = request.method;
        const url = request.url;

        // In production, send to audit repository
        if (process.env.NODE_ENV === 'production') {
          console.log(JSON.stringify({
            type: 'audit',
            userId,
            action: `${method} ${url}`,
            duration,
            timestamp: new Date().toISOString(),
          }));
        }
      }),
    );
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        console.log(`[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${Date.now() - now}ms`);
      }),
    );
  }
}
