// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReceiptView } from '../app/components/receipt';
import { decodeReceipt } from '../lib/verification';
import { PLAN, TEST_SIGNATURE, chainFixture } from './fixtures';
afterEach(cleanup);
it('prioritizes failed execution over plan mismatch in the receipt headline', () => {
  const raw = chainFixture();
  raw.meta.err = { InstructionError: [2, 'InsufficientFunds'] };
  render(<ReceiptView receipt={decodeReceipt(TEST_SIGNATURE, raw, 'confirmed', PLAN)} />);
  expect(screen.getByRole('heading', { name: 'Transaction failed' })).toBeVisible();
  expect(screen.queryByText('Does not match the saved plan')).toBeNull();
});
it('prioritizes missing execution evidence over a generic mismatch headline', () => {
  render(
    <ReceiptView
      receipt={decodeReceipt(TEST_SIGNATURE, { ...chainFixture(), meta: null }, 'finalized', PLAN)}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Transaction unverified' })).toBeVisible();
});
