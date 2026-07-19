import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../shared/errors/app-error';
import logger from '../shared/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  logger.error('Unhandled error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
