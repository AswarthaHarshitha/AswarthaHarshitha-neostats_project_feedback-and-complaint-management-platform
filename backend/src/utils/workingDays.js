const isWeekend = (date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

const workingDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current)) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

module.exports = { workingDaysBetween };
