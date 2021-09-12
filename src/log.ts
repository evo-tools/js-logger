import { Caller } from './caller';
import { resolveSeparators } from './utils';

export type Meta = Readonly<Record<string, unknown>>;

export type Level = 'debug' | 'info' | 'warn' | 'error' | 'critical' | 'verbose' | 'trace';

export interface Message {
  args: unknown;
  caller: unknown;
  date: unknown;
  level: unknown;
  meta: unknown;
  name: unknown;
}

export type PipeFn = (...args: any[]) => unknown;

export type Pipes = Readonly<Record<string, PipeFn>>;

const FORMAT_REPLACE_MASK = /\{\{\s*([a-zA-Z_$][0-9a-zA-Z_$]+)(?:\s*\|\s*([a-zA-Z_$][0-9a-zA-Z_$]+))?\s*\}\}/g;

export type FormatFn = (this: Pipes, message: Message) => unknown;

export class Log {
  protected static lineLength: number = 0;
  static separator: string = '<-|->';

  readonly caller: Caller | null;
  readonly date: number = Date.now();

  constructor(
    readonly name: string | undefined,
    readonly formats: (string | FormatFn)[],
    readonly pipes: Pipes,
    readonly meta: Meta,
    readonly level: Level,
    readonly args: any[],
    readonly callerLevel: number = 0,
  ) {
    this.caller = Caller.create(callerLevel);
    this.pipes = pipes;
  }

  /**
   * Get formatted messages.
   */
  messages(): unknown[] {
    return this.formats.map((f) => {
      if (f === 'json') {
        const cache: any[] = [];
        const jsonMessage = this.toMessage();
        const out = JSON.stringify(jsonMessage, (key: string, value: any) => {
          if (typeof value === 'object' && value) {
            if (cache.includes(value)) {
              return `[circular]`; // TODO: key from cache
            }

            cache.push(value);
          }

          return value as unknown;
        });

        return out;
      }

      if (typeof f === 'function') {
        return f.call(this.pipes, this.toMessage());
      }

      Log.lineLength = process.stdout.columns;

      const stringMessage = f.replace(FORMAT_REPLACE_MASK, (_: string, propName: string, pipeName: string) => {
        const prop = this[propName as keyof Message] as string;

        if (pipeName !== undefined) {
          const pipe = this.pipes[pipeName];

          if (typeof pipe !== 'function') {
            throw new TypeError(`Pipe property "${pipeName}" is not a function`);
          }

          return pipe(prop) as string;
        }

        return prop;
      });

      if (!Log.separator || !stringMessage.includes(Log.separator)) {
        return stringMessage;
      }

      if (Log.lineLength === 0) {
        return stringMessage.split(Log.separator).join('\n');
      }

      return resolveSeparators(stringMessage, Log.separator, Log.lineLength);
    });
  }

  /**
   * Get Message object.
   */
  toMessage(): Message {
    return {
      args: this.args,
      caller: this.caller,
      date: this.date,
      level: this.level,
      meta: this.meta,
      name: this.name,
    };
  }
}