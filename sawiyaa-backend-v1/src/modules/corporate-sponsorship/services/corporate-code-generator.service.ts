import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface GeneratedCode {
  rawCode: string;
  normalizedCode: string;
  prefix: string;
  last4: string;
}

@Injectable()
export class CorporateCodeGeneratorService {
  private static readonly CODE_PREFIX = 'FYD';
  private static readonly SEGMENT_LENGTH = 4;
  private static readonly NUM_SEGMENTS = 3;

  /**
   * Generate a cryptographically secure benefit code.
   * Format: FYD-XXXX-XXXX-XXXX (16 hex chars after FYD-)
   */
  generateCode(): GeneratedCode {
    const rawCode = this.generateRawCode();
    const normalizedCode = rawCode.toUpperCase().trim().replace(/-/g, '');
    const prefix = rawCode.substring(0, 8); // FYD-XXXX (8 chars: FYD- + 4 hex)
    const last4 = rawCode.substring(rawCode.length - 4);

    return {
      rawCode,
      normalizedCode,
      prefix,
      last4,
    };
  }

  private generateRawCode(): string {
    const parts: string[] = [CorporateCodeGeneratorService.CODE_PREFIX];

    for (let i = 0; i < CorporateCodeGeneratorService.NUM_SEGMENTS; i++) {
      const segment = randomBytes(2)
        .toString('hex')
        .toUpperCase()
        .substring(0, CorporateCodeGeneratorService.SEGMENT_LENGTH);
      parts.push(segment);
    }

    return parts.join('-');
  }

  /**
   * Extract prefix from a raw code.
   */
  extractPrefix(rawCode: string): string {
    return rawCode.substring(0, 7);
  }

  /**
   * Extract last 4 characters from a raw code.
   */
  extractLast4(rawCode: string): string {
    return rawCode.substring(rawCode.length - 4);
  }
}
