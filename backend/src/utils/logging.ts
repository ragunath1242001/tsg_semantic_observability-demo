import { Injectable, NestMiddleware, Logger, ConsoleLogger, LogLevel } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";


@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");
  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`${req.method} ${req.originalUrl} (${req.ip})`);
    const time = Date.now();
    
    res.on("finish", () => {
      this.logger.log(`${req.method} ${req.originalUrl} (${req.ip}) -> ${res.statusCode} ${res.get("content-length")} (${Date.now()-time} ms)`)
    });
    next();
  }
}

export class RequestContext {
  static cls = new AsyncLocalStorage<RequestContext>();

  static get currentContext() {
    return this.cls.getStore();
  }

  constructor(public readonly id: string, public readonly req: Request, public readonly res: Response) {}
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware<Request, Response> {
  use(req: Request, res: Response, next: () => void) {
    RequestContext.cls.run(new RequestContext(crypto.randomBytes(16).toString("hex"), req, res), next);
  }
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(level: 'log' | 'debug' | 'verbose') {
    super();
    let levels: LogLevel[] = []
    switch(level) {
      case "log": levels = ['log', 'warn', 'error', 'fatal']; break;
      case "debug": levels = ['debug', 'log', 'warn', 'error', 'fatal']; break;
      case "verbose": levels = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal']; break;
    }
    this.setLogLevels(levels)
  }

  protected override formatPid(): string {
    return '';
  }

  protected formatContext(context: string): string {
    const trace = RequestContext.currentContext?.id || '    ..    ';
    return `[${trace.slice(0,10)}] ` + super.formatContext(context.slice(-20).padStart(20));
  }

  getTimestamp(): string {
    return new Date().toISOString()
  }
}