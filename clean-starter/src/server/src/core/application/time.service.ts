export class TimeService {
  getServerTime(): { time: string, timestamp: number } {
    const now = new Date();
    return {
      time: now.toISOString(),
      timestamp: now.getTime()
    };
  }
}
