import { Level, Meta, Pipes, Record } from './record';

export * from './record';
export * from './caller';

Record.fromFileName = __filename;

export type ConsoleMethods = 'log' | 'info' | 'error' | 'dir' | 'warn' | 'debug' | 'trace';

export default class Logger {
	static readonly CONSOLE_METHODS_KEYS: ConsoleMethods[] = ['log', 'info', 'error', 'dir', 'warn', 'debug', 'trace'];
	static readonly CONSOLE_METHODS: { [methodName: string]: (...args: any[]) => void } = {};

	protected static _logname?: string | undefined;
	protected static readonly _meta: Meta = {};
	protected static readonly _pipes: Pipes = {};
	protected static readonly _formats: string[] = [];
	protected static _debugMode: boolean = false;
	protected static _handler = (record: Record): void => {};

	protected static _handle(instance: typeof Logger | Logger, level: Level, args: any[]): void {
		const { _logname: logname, _formats: formats, _pipes: pipes, _handler: handler } = instance as unknown as LoggerInstance;
		const meta = this._getMeta(instance);
		const record = new Record(logname, formats, pipes, meta, level, args);
		handler.call({}, record);
	}

	protected static _getMeta(instance?: typeof Logger | Logger): Meta {
		if (!instance || instance === this) {
			return { ...this._meta };
		}

		return { ...this._meta, ...(instance as unknown as LoggerInstance)._meta };
	}

	/**
	 * @description Set global options.
	 */
	static configure(options: LoggerOptions): void {
		if (options.name) {
			this._logname = options.name;
		}

		if (options.debug) {
			this._debugMode = true;
		}

		if (Array.isArray(options.formats)) {
			this._formats.splice(0, this._formats.length, ...options.formats);
		}

		if (options.pipes && typeof options.pipes === 'object') {
			Object.assign(this._pipes, options.pipes);
		}

		if (options.meta && typeof options.meta === 'object') {
			Object.assign(this._meta, options.meta);
		}

		if (typeof options.handler === 'function') {
			this._handler = options.handler;
		}
	}

	/**
	 * @description Override console methods.
	 */
	static overrideConsole(): void {
		Object.defineProperty(console, 'logger', { value: Logger, writable: false });

		for (const m of this.CONSOLE_METHODS_KEYS) {
			console[m] = Logger[m].bind(Logger);
		}

		console.meta = (meta: Meta): Logger => Logger.meta(meta);
		console.name = (name: string): Logger => Logger.useName(name);

		process.on('uncaughtException', (err) => {
			Logger.critical(err);
			process.exit(0);
		});
	}

	/**
	 * @description Create a new logger with the name.
	 */
	static useName(name: string): Logger {
		return new Logger({ name });
	}

	/**
	 * @description Create a new logger with metadata.
	 */
	static meta(meta: Meta): Logger {
		const logger = new Logger();
		Object.assign(logger._meta, Logger._meta, meta);

		return logger;
	}

	/**
	 * @description Create a record with 'debug' log type.
	 */
	static log(...args: any[]): void {
		this._handle(this, 'debug', args);
	}

	/**
	 * @description Create a record with 'debug' log type. Enable debug for working.
	 */
	static debug(...args: any[]): void {
		if (this._debugMode) {
			this._handle(this, 'debug', args);
		}
	}

	/**
	 * @description Create a record with 'info' log type.
	 */
	static info(...args: any[]): void {
		this._handle(this, 'info', args);
	}

	/**
	 * @description Create a record with 'warn' log type.
	 */
	static warn(...args: any[]): void {
		this._handle(this, 'warn', args);
	}

	/**
	 * @description Create a record with 'trace' log type.
	 */
	static trace(...args: any[]): void {
		this._handle(this, 'trace', args);
	}

	/**
	 * @description Create a record with 'error' log type.
	 */
	static error(...args: any[]): void {
		this._handle(this, 'error', args);
	}

	/**
	 * @description Create a record with 'critical' log type.
	 */
	static critical(...args: any[]): void {
		this._handle(this, 'critical', args);
	}

	/**
	 * @description Create a record with 'verbose' log type.
	 */
	static dir(...args: any[]): void {
		this._handle(this, 'verbose', args);
	}

	protected readonly _logname: string | undefined;
	protected readonly _meta: Meta = {};
	protected readonly _pipes: Pipes = {};
	protected readonly _formats: string[];
	protected readonly _debugMode: boolean;

	/**
	 * @description Create new Logger with custom options
	 */
	constructor(options?: LoggerOptions) {
		Object.assign(this._meta, Logger._meta);
		Object.assign(this._pipes, Logger._pipes);
		this._handler = Logger._handler;
		this._logname = Logger._logname;
		this._formats = Array.from(Logger._formats);
		this._debugMode = Logger._debugMode;

		if (!options) {
			return;
		}

		if (options.name) {
			this._logname = options.name;
		}

		if (typeof options.debug === 'boolean') {
			this._debugMode = options.debug;
		}

		if (Array.isArray(options.formats)) {
			this._formats = Array.from(options.formats);
		}

		if (options.pipes) {
			Object.assign(this._pipes, options.pipes);
		}

		if (options.meta) {
			Object.assign(this._meta, options.meta);
		}

		if (typeof options.handler === 'function') {
			this._handler = options.handler;
		}
	}

	private readonly _handler = (record: Record): void => {};

	/**
	 * @description Create a new logger with name and options of current logger.
	 */
	name(name: string): Logger {
		const logger = this.clone();

		Object.defineProperty(logger, '_logname', {
			value: logger._logname && name ? `${logger._logname}.${name}` : (name || logger._logname),
			writable: false,
		});

		return logger;
	}

	/**
	 * @description Add metadata to current logger.
	 */
	meta(meta: Meta): void {
		Object.assign(this._meta, meta);
	}

	/**
	 * @description Create a new logger with options of current logger.
	 */
	clone(): Logger {
		return new Logger({
			name: this._logname,
			meta: this._meta,
			formats: this._formats,
			pipes: this._pipes,
			handler: this._handler,
		});
	}

	/**
	 * @description Create a record with 'debug' log type.
	 */
	log(...args: any[]): void {
		Logger._handle(this, 'debug', args);
	}

	/**
	 * @description Create a record with 'debug' log type. Enable debug for working.
	 */
	debug(...args: any[]): void {
		if (Logger._debugMode) {
			Logger._handle(this, 'debug', args);
		}
	}

	/**
	 * @description Create a record with 'info' log type.
	 */
	info(...args: any[]): void {
		Logger._handle(this, 'info', args);
	}

	/**
	 * @description Create a record with 'warn' log type.
	 */
	warn(...args: any[]): void {
		Logger._handle(this, 'warn', args);
	}

	/**
	 * @description Create a record with 'trace' log type.
	 */
	trace(...args: any[]): void {
		Logger._handle(this, 'trace', args);
	}

	/**
	 * @description Create a record with 'error' log type.
	 */
	error(...args: any[]): void {
		Logger._handle(this, 'error', args);
	}

	/**
	 * @description Create a record with 'critical' log type.
	 */
	critical(...args: any[]): void {
		Logger._handle(this, 'critical', args);
	}

	/**
	 * @description Create a record with 'verbose' log type.
	 */
	dir(...args: any[]): void {
		Logger._handle(this, 'verbose', args);
	}
}

declare global {
	interface Console {

		/**
		 * @description Logger type.
		 */
		logger: typeof Logger;

		/**
		 * @description Create a new logger with metadata.
		 */
		meta(meta: Meta): Logger;

		/**
		 * @description Create a new logger with name.
		 */
		name(name: string): Logger;
	}
}

interface LoggerInstance {
	_logname: string | undefined;
	_meta: Meta;
	_pipes: Pipes;
	_formats: string[];
	_debugMode: boolean;
	_handler(record: Record): void;
}

export interface LoggerOptions {

	/**
	 * @description Name of the logger.
	 */
	name?: string;

	/**
	 * @description Object with logger metadata.
	 */
	meta?: Meta;

	/**
	 * @description Output message formats.
	 */
	formats?: string[];

	/**
	 * @description Functions for message formatting.
	 */
	pipes?: Pipes;

	/**
	 * @description Output record handler. Set the handler for handle output messages.
	 */
	handler?(record: Record): void;

	/**
	 * @description Enable debug method. When is true: logger.debug() will works.
	 */
	debug?: boolean;
}

for (const m of Logger.CONSOLE_METHODS_KEYS) {
	Object.defineProperty(Logger.CONSOLE_METHODS, m, {
		value: console[m],
		writable: false,
	});
}
