import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

type ValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

const formatIssues = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message
  }));

const replaceRequestObject = (target: Record<string, unknown>, nextValue: Record<string, unknown>) => {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.assign(target, nextValue);
};

export const validate = (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        replaceRequestObject(req.params as Record<string, unknown>, schemas.params.parse(req.params));
      }
      if (schemas.query) {
        replaceRequestObject(req.query as Record<string, unknown>, schemas.query.parse(req.query));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid request payload.',
          fields: formatIssues(error)
        });
      }

      return next(error);
    }
  };

export default validate;
