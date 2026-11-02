import {proxyMocoto} from './mocoto.js';
export const onRequest = (context) => proxyMocoto(context, true);
