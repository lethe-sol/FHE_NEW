

import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_RPC_URL?: string;
    }
  }
}
