import { EventEmitter } from 'events';

class GSIEmitter extends EventEmitter {}

export const gsiEmitter = new GSIEmitter();
