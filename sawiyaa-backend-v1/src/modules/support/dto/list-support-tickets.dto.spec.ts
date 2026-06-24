import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListSupportTicketsDto } from './list-support-tickets.dto';

describe('ListSupportTicketsDto', () => {
  it('keeps assignedToMe undefined when omitted', () => {
    const dto = plainToInstance(ListSupportTicketsDto, {});
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.assignedToMe).toBeUndefined();
  });

  it('parses assignedToMe=true correctly', () => {
    const dto = plainToInstance(ListSupportTicketsDto, {
      assignedToMe: 'true',
    });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.assignedToMe).toBe(true);
  });

  it('parses assignedToMe=false correctly', () => {
    const dto = plainToInstance(ListSupportTicketsDto, {
      assignedToMe: 'false',
    });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.assignedToMe).toBe(false);
  });

  it('rejects invalid assignedToMe value', () => {
    const dto = plainToInstance(ListSupportTicketsDto, {
      assignedToMe: 'nope',
    });
    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
