import { Injectable, Logger } from "@nestjs/common";
import { AuditLogEntry } from "@tsg-dsp/common-dtos";

import { AuditLogHandler } from "./audit.log.service.js";

@Injectable()
export class CompositeAuditLogHandler implements AuditLogHandler {
  private readonly logger = new Logger("CompositeAuditLogHandler");
  private handlers: AuditLogHandler[] = [];

  setHandlers(handlers: AuditLogHandler[]) {
    this.handlers = handlers;
  }

  async write(entry: AuditLogEntry): Promise<void> {
    await Promise.allSettled(
      this.handlers.map((handler) =>
        handler.write(entry).catch((err) => {
          this.logger.error(
            `Audit handler ${handler.constructor.name} failed: ${err.message}`,
            err.stack
          );
        })
      )
    );
  }
}
