'use client';
import { useState } from 'react';
import { Users } from 'lucide-react';
import { validateContacts, type Contact } from '@/lib/payments';

export function DemoRecipientSetup({
  contacts,
  onChange,
  disabled,
}: {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/demo-recipients.json');
      if (!response.ok) throw new Error('Addresses unavailable.');
      const data = await response.json();
      const recipients = validateContacts(data.recipients);
      if (recipients.length !== 3) throw new Error('Three demo recipients are required.');
      onChange(recipients);
      setMessage(
        'Ada, Chidi, and Reserve are saved. Review their full addresses below, then choose Manual Mode or interpret a brief.',
      );
      setConfirm(false);
    } catch {
      setMessage(
        'Demo addresses could not be saved. Open Address book to add reviewed public addresses manually.',
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <section
      id="recipient-setup"
      className="recipient-setup"
      aria-labelledby="recipient-setup-title"
    >
      <div className="recipient-setup-copy">
        <h2 id="recipient-setup-title">
          <Users size={16} /> Set up recipients{' '}
          <span className="small muted">{contacts.length}/3 saved</span>
        </h2>
        <p className="small muted">
          Use your own reviewed public addresses, or load Ada, Chidi, and Reserve for a tiny Devnet
          test. Demo addresses have no retained keys.
        </p>
        {message && (
          <p className="small" role="status">
            {message}
          </p>
        )}
        {confirm && (
          <p className="small">
            Replace the {contacts.length} saved contact(s) on this browser? Your payment history
            stays saved.
          </p>
        )}
      </div>
      <div className="recipient-setup-actions">
        {confirm ? (
          <>
            <button className="button" disabled={disabled || loading} onClick={load}>
              Replace saved contacts with demo recipients
            </button>
            <button className="text-button" disabled={loading} onClick={() => setConfirm(false)}>
              Keep my contacts
            </button>
          </>
        ) : (
          <button
            className="button"
            disabled={disabled || loading}
            onClick={() => (contacts.length ? setConfirm(true) : void load())}
          >
            {loading ? 'Loading addresses…' : 'Load disposable demo recipients'}
          </button>
        )}
        <a className="text-button" href="#contacts">
          Review address book
        </a>
      </div>
    </section>
  );
}
