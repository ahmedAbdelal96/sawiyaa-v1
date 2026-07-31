import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AdminPractitionerWalletSortBy, GetAdminPractitionerWalletDto, ListAdminPractitionerWalletsDto } from '../dto/admin-practitioner-wallets.dto';

const money = (value: unknown) => new Prisma.Decimal(String(value ?? 0)).toFixed(2);

@Injectable()
export class AdminPractitionerWalletReadService {
  constructor(private readonly prisma: PrismaService) {}

  private practitionerSelect = {
    id: true,
    publicSlug: true,
    user: { select: { displayName: true, emails: { where: { isPrimary: true }, take: 1, select: { email: true } } } },
  } as const;

  async list(query: ListAdminPractitionerWalletsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const currencyCode = query.currencyCode?.trim().toUpperCase() || undefined;
    const search = query.search?.trim();
    const where: Prisma.PractitionerWalletWhereInput = {
      status: 'ACTIVE',
      ...(currencyCode ? { currencyCode } : {}),
      ...(search ? { practitioner: { OR: [
        { publicSlug: { contains: search, mode: 'insensitive' } },
        { user: { displayName: { contains: search, mode: 'insensitive' } } },
        { user: { emails: { some: { email: { contains: search, mode: 'insensitive' } } } } },
      ] } } : {}),
    };
    const direction = query.sortDirection ?? 'desc';
    const orderBy: Prisma.PractitionerWalletOrderByWithRelationInput[] = query.sortBy === AdminPractitionerWalletSortBy.BALANCE
      ? [{ availableBalance: direction }, { id: 'asc' }]
      : query.sortBy === AdminPractitionerWalletSortBy.NAME
        ? [{ practitioner: { user: { displayName: direction } } }, { id: 'asc' }]
        : [{ lastLedgerEntryAt: direction }, { updatedAt: 'desc' }, { id: 'asc' }];
    const [wallets, totalItems] = await Promise.all([
      this.prisma.practitionerWallet.findMany({ where, select: { id: true, practitionerId: true, currencyCode: true, status: true, availableBalance: true, lastLedgerEntryAt: true, updatedAt: true, practitioner: { select: this.practitionerSelect } }, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.practitionerWallet.count({ where }),
    ]);
    const practitionerIds = wallets.map(wallet => wallet.practitionerId);
    const currencies = Array.from(new Set(wallets.map(wallet => wallet.currencyCode)));
    const [credits, payouts] = await Promise.all([
      practitionerIds.length ? this.prisma.ledgerEntry.groupBy({ by: ['practitionerId', 'currencyCode'], where: { practitionerId: { in: practitionerIds }, currencyCode: { in: currencies }, entryType: LedgerEntryType.PRACTITIONER_EARNING, direction: LedgerDirection.CREDIT }, _sum: { amount: true } }) : Promise.resolve([]),
      practitionerIds.length ? this.prisma.practitionerSettlementPayout.groupBy({ by: ['practitionerId', 'currencyCode'], where: { practitionerId: { in: practitionerIds }, currencyCode: { in: currencies } }, _sum: { amountPaid: true }, _max: { effectiveAt: true } }) : Promise.resolve([]),
    ]);
    const creditMap = new Map<string, string>(credits.map(row => [`${row.practitionerId}:${row.currencyCode}`, money(row._sum.amount)] as const));
    const payoutMap = new Map<string, { amount: string; last: Date | null }>(payouts.map(row => [`${row.practitionerId}:${row.currencyCode}`, { amount: money(row._sum.amountPaid), last: row._max.effectiveAt }] as const));
    return { items: wallets.map(wallet => {
      const key = `${wallet.practitionerId}:${wallet.currencyCode}`;
      const payout = payoutMap.get(key);
      const latest = [wallet.lastLedgerEntryAt, payout?.last ?? null].filter(Boolean).sort((a, b) => new Date(b as Date).getTime() - new Date(a as Date).getTime())[0] ?? null;
      return { walletId: wallet.id, practitionerId: wallet.practitionerId, practitionerReference: wallet.practitioner.publicSlug, practitionerName: wallet.practitioner.user.displayName ?? wallet.practitioner.publicSlug, practitionerEmail: wallet.practitioner.user.emails[0]?.email ?? null, currencyCode: wallet.currencyCode, availableBalance: money(wallet.availableBalance), totalCredited: creditMap.get(key) ?? '0.00', totalExternallyTransferred: payout?.amount ?? '0.00', latestActivityType: latest && payout?.last && new Date(payout.last).getTime() >= new Date(latest).getTime() ? 'SETTLEMENT_PAYOUT' : latest ? 'PRACTITIONER_EARNING' : null, latestActivityAt: latest, updatedAt: wallet.updatedAt };
    }), pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) } };
  }

  async detail(walletId: string, query: GetAdminPractitionerWalletDto) {
    const wallet = await this.prisma.practitionerWallet.findUnique({ where: { id: walletId }, select: { id: true, practitionerId: true, currencyCode: true, status: true, availableBalance: true, lastLedgerEntryAt: true, updatedAt: true, practitioner: { select: this.practitionerSelect } } });
    if (!wallet) throw new NotFoundException('Practitioner wallet was not found');
    const limit = query.limit ?? 20;
    const [ledger, settlements, transfers] = await Promise.all([
      this.prisma.ledgerEntry.findMany({ where: { practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode }, orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }], take: limit, select: { id: true, entryType: true, direction: true, amount: true, currencyCode: true, settlementId: true, sessionId: true, effectiveAt: true, createdAt: true, actorUser: { select: { displayName: true } } } }),
      this.prisma.practitionerSettlement.findMany({ where: { walletId: wallet.id }, orderBy: [{ approvedAt: 'desc' }, { updatedAt: 'desc' }], take: limit, select: { id: true, status: true, finalWalletCredit: true, amountNet: true, walletCurrencyCode: true, approvedAt: true, sourceReview: { select: { sessionId: true } } } }),
      this.prisma.practitionerSettlementPayout.findMany({ where: { practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode }, orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }], take: limit, select: { id: true, settlementId: true, amountPaid: true, currencyCode: true, payoutMethod: true, externalPayoutRef: true, effectiveAt: true, actorUser: { select: { displayName: true } }, processedByUser: { select: { displayName: true } }, settlement: { select: { sourceReview: { select: { sessionId: true } } } } } }),
    ]);
    const sessionIds = Array.from(new Set([...ledger.map(item => item.sessionId), ...settlements.map(item => item.sourceReview?.sessionId), ...transfers.map(item => item.settlement.sourceReview?.sessionId)].filter((id): id is string => Boolean(id))));
    const sessions = sessionIds.length ? await this.prisma.session.findMany({ where: { id: { in: sessionIds } }, select: { id: true, sessionCode: true } }) : [];
    const sessionMap = new Map(sessions.map(session => [session.id, session.sessionCode]));
    const credits = await this.prisma.ledgerEntry.aggregate({ where: { practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode, entryType: LedgerEntryType.PRACTITIONER_EARNING, direction: LedgerDirection.CREDIT }, _sum: { amount: true } });
    const payoutTotal = await this.prisma.practitionerSettlementPayout.aggregate({ where: { practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode }, _sum: { amountPaid: true } });
    return { practitioner: { id: wallet.practitioner.id, reference: wallet.practitioner.publicSlug, name: wallet.practitioner.user.displayName ?? wallet.practitioner.publicSlug, email: wallet.practitioner.user.emails[0]?.email ?? null }, wallet: { id: wallet.id, currencyCode: wallet.currencyCode, status: wallet.status, availableBalance: money(wallet.availableBalance), totalCredited: money(credits._sum.amount), totalExternallyTransferred: money(payoutTotal._sum.amountPaid), latestActivityAt: wallet.lastLedgerEntryAt ?? null, updatedAt: wallet.updatedAt }, recentLedgerEntries: ledger.map(item => ({ id: item.id, type: item.entryType, amount: money(item.amount), direction: item.direction, currencyCode: item.currencyCode, settlementId: item.settlementId, sessionId: item.sessionId, sessionCode: item.sessionId ? sessionMap.get(item.sessionId) ?? null : null, sessionReference: item.sessionId ? sessionMap.get(item.sessionId) ?? null : null, effectiveAt: item.effectiveAt, createdAt: item.createdAt, createdBy: item.actorUser?.displayName ?? null })), recentSettlements: settlements.map(item => ({ id: item.id, settlementReference: item.id.slice(0, 8), sessionId: item.sourceReview?.sessionId ?? null, sessionCode: item.sourceReview?.sessionId ? sessionMap.get(item.sourceReview.sessionId) ?? null : null, sessionReference: item.sourceReview?.sessionId ? sessionMap.get(item.sourceReview.sessionId) ?? null : null, amountCredited: money(item.finalWalletCredit ?? item.amountNet), currencyCode: item.walletCurrencyCode, status: item.status, approvedAt: item.approvedAt })), recentTransfers: transfers.map(item => ({ id: item.id, transferReference: item.id.slice(0, 8), settlementId: item.settlementId, settlementReference: item.settlementId.slice(0, 8), sessionCode: item.settlement.sourceReview?.sessionId ? sessionMap.get(item.settlement.sourceReview.sessionId) ?? null : null, sessionReference: item.settlement.sourceReview?.sessionId ? sessionMap.get(item.settlement.sourceReview.sessionId) ?? null : null, amount: money(item.amountPaid), currencyCode: item.currencyCode, transferMethod: item.payoutMethod, externalReference: item.externalPayoutRef, transferredAt: item.effectiveAt, executedBy: item.actorUser?.displayName ?? item.processedByUser?.displayName ?? null, status: 'RECORDED' })) };
  }
}
