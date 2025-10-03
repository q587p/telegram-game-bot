import { mkdirSync, existsSync } from "node:fs";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import type { StorageAdapter } from "grammy";
function sanitize(key: string) { return key.replace(/[^a-z0-9_-]/gi, "_"); }
export class FileStorage<T> implements StorageAdapter<T> {
  constructor(private baseDir: string) { if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true }); }
  private pathFor(key: string) { return join(this.baseDir, sanitize(key) + ".json"); }
  async read(key: string): Promise<T | undefined> { try { return JSON.parse(await fsp.readFile(this.pathFor(key), "utf8")) as T; } catch(e:any){ if(e.code==="ENOENT") return undefined; throw e; } }
  async write(key: string, value: T): Promise<void> { await fsp.writeFile(this.pathFor(key), JSON.stringify(value), "utf8"); }
  async delete(key: string): Promise<void> { try { await fsp.unlink(this.pathFor(key)); } catch(e:any){ if(e.code!=="ENOENT") throw e; } }
}
