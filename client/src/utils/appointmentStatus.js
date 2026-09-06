export function getDisplayStatus(appointment) {
  const { status, date, startTime } = appointment;
  if (['pending', 'confirmed'].includes(status)) {
    const [h, m] = startTime.split(':').map(Number);
    const asUtc = new Date(date);
    const dt = new Date(asUtc.getUTCFullYear(), asUtc.getUTCMonth(), asUtc.getUTCDate(), h, m, 0, 0);
    if (dt < new Date()) return 'passed';
  }
  return status;
}
