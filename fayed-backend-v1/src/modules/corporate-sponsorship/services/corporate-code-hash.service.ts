import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHmac } from 'crypto';

const CURRENT_PEPPER_VERSION = 1;

export interface CodeHashResult {
  codeHash: string;
  pepperVersion: number;
}

@Injectable()
export class CorporateCodeHashService implements OnModuleInit {
  private pepper: string;

  onModuleInit() {
    const pepper = process.env.CORPORATE_CODE_PEPPER;
    if (!pepper) {
      throw new Error(
        'CORPORATE_CODE_PEPPER environment variable is not set. ' +
          'Set a strong, unique pepper value for HMAC-SHA256 code hashing.',
      );
    }
    if (pepper.length < 32) {
      throw new Error(
        'CORPORATE_CODE_PEPPER must be at least 32 characters long for security.',
      );
    }
    this.pepper = pepper;
  }

  /**
   * Normalize a raw benefit code before hashing.
   * - Uppercase
   * - Trim whitespace
   * - Remove hyphens (separators)
   */
  normalizeCode(rawCode: string): string {
    return rawCode.toUpperCase().trim().replace(/-/g, '');
  }

  /**
   * Compute HMAC-SHA256 of the code.
   * Input: normalizedCompanyCode + ":" + normalizedBenefitCode
   */
  hashCode(companyCode: string, rawBenefitCode: string): CodeHashResult {
    const normalizedCompany = this.normalizeCode(companyCode);
    const normalizedBenefit = this.normalizeCode(rawBenefitCode);
    const input = `${normalizedCompany}:${normalizedBenefit}`;

    const codeHash = createHmac('sha256', this.pepper)
      .update(input)
      .digest('hex');

    return {
      codeHash,
      pepperVersion: CURRENT_PEPPER_VERSION,
    };
  }

  /**
   * Verify a raw code against a stored hash.
   */
  verifyCode(
    companyCode: string,
    rawBenefitCode: string,
    storedHash: string,
    pepperVersion: number,
  ): boolean {
    if (pepperVersion !== CURRENT_PEPPER_VERSION) {
      return false;
    }
    const { codeHash } = this.hashCode(companyCode, rawBenefitCode);
    return codeHash === storedHash;
  }

  getPepperVersion(): number {
    return CURRENT_PEPPER_VERSION;
  }
}
