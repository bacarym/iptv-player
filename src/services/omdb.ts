const OMDB_API_BASE = 'https://www.omdbapi.com/';

// Cache léger pour limiter les appels (clé = `${type}-${title}-${year}`)
const awardsCache = new Map<string, string | null>();

export type OmdbType = 'movie' | 'series';

export class OMDBClient {
  private apiKey: string;
  private queue: Array<() => void> = [];
  private active = 0;
  private concurrency = 8; // limiter la concurrence pour éviter les bursts

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.active += 1;
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        } finally {
          this.active -= 1;
          this.next();
        }
      };
      this.queue.push(task);
      this.next();
    });
  }

  private next() {
    if (this.active >= this.concurrency) return;
    const task = this.queue.shift();
    if (task) task();
  }

  private buildUrl(params: Record<string, string>): string {
    const url = new URL(OMDB_API_BASE);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('apikey', this.apiKey);
    return url.toString();
  }

  /**
   * Récupère le champ Awards (ex: "Won 6 Oscars. 98 wins & 159 nominations total.")
   * Retourne null si rien ou "N/A".
   */
  async getAwards(title: string, year?: number, type: OmdbType = 'movie'): Promise<string | null> {
    const key = `${type}-${title}-${year || ''}`;
    if (awardsCache.has(key)) return awardsCache.get(key) ?? null;

    const params: Record<string, string> = { t: title, type };
    if (year) params.y = String(year);

    const url = this.buildUrl(params);

    const run = async () => {
      const res = await fetch(url);
      if (!res.ok) {
        awardsCache.set(key, null);
        return null;
      }

      const data = await res.json();
      const awards = data?.Awards;
      const valid = awards && awards !== 'N/A' ? String(awards) : null;
      awardsCache.set(key, valid);
      return valid;
    };

    return this.enqueue(run);
  }
}

