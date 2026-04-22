import { Injectable } from '@nestjs/common';
import { ListCustomerWalletEntriesDto } from '../dto/list-customer-wallet-entries.dto';
import { CustomerWalletPatientRepository } from '../repositories/customer-wallet-patient.repository';
import { CustomerWalletAccountingService } from '../services/customer-wallet-accounting.service';

@Injectable()
export class ListCustomerWalletEntriesUseCase {
  constructor(
    private readonly customerWalletPatientRepository: CustomerWalletPatientRepository,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
  ) {}

  async execute(input: {
    userId?: string;
    patientId?: string;
    query: ListCustomerWalletEntriesDto;
  }) {
    let patientId = input.patientId;

    if (!patientId && input.userId) {
      const patient = await this.customerWalletPatientRepository.findByUserId(
        input.userId,
      );
      if (!patient) {
        return {
          items: [],
          pagination: {
            page: input.query.page ?? 1,
            limit: input.query.limit ?? 20,
            totalItems: 0,
            totalPages: 1,
          },
        };
      }
      patientId = patient.id;
    }

    if (!patientId) {
      return {
        items: [],
        pagination: {
          page: input.query.page ?? 1,
          limit: input.query.limit ?? 20,
          totalItems: 0,
          totalPages: 1,
        },
      };
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;

    const [entries, totalItems] =
      await this.customerWalletAccountingService.listWalletEntries({
        patientId,
        currencyCode: input.query.currencyCode,
        page,
        limit,
      });

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        entryType: entry.entryType,
        direction: entry.direction,
        amount: entry.amount.toString(),
        currencyCode: entry.currencyCode,
        description: entry.description ?? null,
        paymentId: entry.paymentId ?? null,
        refundId: entry.refundId ?? null,
        sessionId: entry.sessionId ?? null,
        referenceType: entry.referenceType ?? null,
        referenceId: entry.referenceId ?? null,
        effectiveAt: entry.effectiveAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
