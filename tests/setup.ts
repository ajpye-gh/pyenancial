import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom doesn't expose these globally (unlike every real browser) - needed for base64url encoding
// of share links (see lib/planShare.ts).
Object.assign(globalThis, { TextEncoder, TextDecoder });
