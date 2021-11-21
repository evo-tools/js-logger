import { install, wrapCallSite } from 'source-map-support';

import type { LogLevel } from '.';
import { LOG_LEVELS } from '.';

install();

const NATIVE_PREPARE_STACK_TRACE = Error.prepareStackTrace;
const OVERRIDED_PREPARE_STACK_TRACE = (e: Error, s: NodeJS.CallSite[]): NodeJS.CallSite[] => s;
const HANDLE_METHOD_NAME = '_handle';

export class Caller {
  static MAX_CALLERS_COUNT = 1;

  readonly fileName?: string;
  readonly methodName?: string;
  readonly functionName?: string;
  readonly typeName?: string;
  readonly line?: number;
  readonly column?: number;
  readonly trace?: Caller[];

  protected constructor(callSite: NodeJS.CallSite, parentCallSites?: NodeJS.CallSite[]) {
    this.fileName = callSite.getFileName() || undefined;
    this.methodName = callSite.getMethodName() || undefined;
    this.functionName = callSite.getFunctionName() || undefined;
    this.typeName = callSite.getTypeName() || undefined;
    this.line = callSite.getLineNumber() || undefined;
    this.column = callSite.getColumnNumber() || undefined;
    this.trace = parentCallSites?.map((cs) => new Caller(cs));
  }

  /**
	 * Create caller.
	 */
  static create(level: number, maxCallersCount: number = Caller.MAX_CALLERS_COUNT): Caller | null {
    let methodName: string | null;

    const callSites = this._getCallSites();

    let callSite: NodeJS.CallSite = callSites[0];

    for (let i = 1, foundHandle = false, len = callSites.length; i < len; i++) {
      callSite = callSites[i];
      methodName = callSite.getMethodName();

      if (!foundHandle && methodName === HANDLE_METHOD_NAME) {
        foundHandle = true;

        continue;
      }

      if (foundHandle && LOG_LEVELS.includes(methodName as LogLevel)) {
        const j = i + level;
        callSite = callSites[j + 1];

        const startIndex = j + 2;
        const endIndex = startIndex + maxCallersCount;
        const parentCallSites = callSites.slice(startIndex, endIndex);

        return new Caller(callSite, parentCallSites);
      }
    }

    return new Caller(callSite);
  }

  protected static _getCallSites(): NodeJS.CallSite[] {
    Error.prepareStackTrace = OVERRIDED_PREPARE_STACK_TRACE;

    const callSites = new Error().stack as unknown as ReturnType<typeof OVERRIDED_PREPARE_STACK_TRACE>;

    Error.prepareStackTrace = NATIVE_PREPARE_STACK_TRACE;

    return callSites.map(wrapCallSite) as NodeJS.CallSite[];
  }
}
