export function buildAvailabilityRange(days = 14) {
  const from = new Date();
  const to = new Date(from);

  to.setDate(to.getDate() + days);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function formatWindowRange(startsAt: string, endsAt: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}
