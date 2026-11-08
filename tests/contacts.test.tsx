// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Contacts } from '../app/components/contacts';
import { DemoRecipientSetup } from '../app/components/demo-recipient-setup';
import { CONTACTS } from './fixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('contact manager', () => {
  it('shows useful empty onboarding', () => {
    render(<Contacts contacts={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Add your first recipient')).toBeVisible();
    expect(screen.getByLabelText('Solana public address')).toBeVisible();
  });
  it('rejects invalid public addresses before local persistence', () => {
    const save = vi.fn();
    render(<Contacts contacts={[]} onChange={save} />);
    fireEvent.change(screen.getByLabelText('Contact name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Solana public address'), {
      target: { value: 'bad address' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save recipient' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('adds an explicitly reviewed full public address', () => {
    const save = vi.fn();
    render(<Contacts contacts={[]} onChange={save} />);
    fireEvent.change(screen.getByLabelText('Contact name'), {
      target: { value: CONTACTS[0].name },
    });
    fireEvent.change(screen.getByLabelText('Solana public address'), {
      target: { value: CONTACTS[0].address },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save recipient' }));
    expect(save).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Ada', address: CONTACTS[0].address }),
    ]);
  });
  it('requires an explicit second action to remove a recipient', () => {
    const save = vi.fn();
    render(<Contacts contacts={CONTACTS} onChange={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada' }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove contact' }));
    expect(save).toHaveBeenCalledWith(CONTACTS.slice(1));
  });
  it('loads the full address for editing', () => {
    render(<Contacts contacts={CONTACTS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Ada' }));
    expect(screen.getByLabelText('Solana public address')).toHaveValue(CONTACTS[0].address);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });
  it('locks contact edits while the review is frozen', () => {
    render(<Contacts contacts={CONTACTS} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Edit Ada' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeDisabled();
  });
});

describe('visible demo recipient setup', () => {
  it('stays available with saved contacts and requires confirmation before replacing them', () => {
    const save = vi.fn();
    render(<DemoRecipientSetup contacts={CONTACTS} onChange={save} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load disposable demo recipients' }));
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Replace saved contacts with demo recipients' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my contacts' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Load disposable demo recipients' })).toBeVisible();
  });
  it('loads and validates three public recipients from the independent onboarding file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recipients: CONTACTS }) }),
    );
    const save = vi.fn();
    render(<DemoRecipientSetup contacts={[]} onChange={save} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load disposable demo recipients' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(CONTACTS));
    expect(fetch).toHaveBeenCalledWith('/demo-recipients.json');
  });
  it('does not erase the address book when the demo payload is incomplete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ recipients: [] }) }),
    );
    const save = vi.fn();
    render(<DemoRecipientSetup contacts={CONTACTS} onChange={save} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load disposable demo recipients' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Replace saved contacts with demo recipients' }),
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('could not be saved'));
    expect(save).not.toHaveBeenCalled();
  });
});
