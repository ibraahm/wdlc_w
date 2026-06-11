import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DDService } from './dd.service';

/**
 * Nightly recompute of every DD document's status so files roll
 * OK → EXPIRING → EXPIRED automatically as expiry dates pass, without anyone
 * having to re-open each record.
 */
@Injectable()
export class DDCronService {
  private readonly logger = new Logger(DDCronService.name);

  constructor(private dd: DDService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'dd-status-recompute' })
  async recompute() {
    try {
      const { scanned, changed } = await this.dd.recomputeAllStatuses();
      this.logger.log(`DD status recompute: scanned ${scanned}, changed ${changed}`);
    } catch (err) {
      this.logger.error('DD status recompute failed', err as Error);
    }
  }
}
