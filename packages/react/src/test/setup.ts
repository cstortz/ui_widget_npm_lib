import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { mockMatchMedia } from './helpers.js';

mockMatchMedia(false);

afterEach(() => {
  cleanup();
  mockMatchMedia(false);
});
