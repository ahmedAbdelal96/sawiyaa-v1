import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AccountingJournalPostingService append-only boundary', () => {
  it('creates journal entries and lines without runtime update/delete calls', () => {
    const source = readFileSync(
      resolve(__dirname, 'accounting-journal-posting.service.ts'),
      'utf8',
    );

    expect(source).toContain('tx.journalEntry.create');
    expect(source).toContain('tx.journalLine.createMany');
    expect(source).not.toMatch(/journalEntry\.(update|updateMany|delete|deleteMany)/);
    expect(source).not.toMatch(/journalLine\.(update|updateMany|delete|deleteMany)/);
    expect(source).toContain('this.assertBalanced(lines)');
  });
});
