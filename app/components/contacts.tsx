'use client';
import { useState, type FormEvent } from 'react';
import { Check, Copy, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { validateContacts, type Contact } from '@/lib/payments';

export function Contacts({
  contacts,
  onChange,
  disabled = false,
}: {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  function reset() {
    setEditing(null);
    setName('');
    setAddress('');
    setDescription('');
    setError('');
  }
  function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const item = {
        id: editing ?? crypto.randomUUID(),
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
      };
      const updated = editing
        ? contacts.map((contact) => (contact.id === editing ? item : contact))
        : [...contacts, item];
      onChange(validateContacts(updated));
      reset();
    } catch (error) {
      setError(
        error instanceof Error && !error.message.startsWith('[')
          ? error.message
          : 'Check the contact name and Solana public address.',
      );
    }
  }
  return (
    <section id="contacts" className="contacts-section panel" aria-labelledby="contacts-title">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <Users size={19} />
          <h2 id="contacts-title">Your address book</h2>
          <span className="muted small">{contacts.length}/3</span>
        </div>
        <span className="badge">Stored on this browser</span>
      </div>
      <div className="contact-content">
        <div className="contact-list">
          <p className="muted small">
            Give each recipient a name and a public Solana address you have checked. Gemini only
            sees the names.
          </p>
          {contacts.length === 0 && (
            <div className="empty-contacts">
              <Users size={26} />
              <h3>Add your first recipient</h3>
              <p>
                Use Ada, Chidi, and Reserve to try the sample brief. Each needs a different address.
              </p>
              <a className="text-button" href="#recipient-setup">
                Use the demo recipient setup above
              </a>
              <p className="small">
                Optional test addresses with no retained keys. Review the full addresses before
                paying.
              </p>
            </div>
          )}
          {contacts.map((contact) => (
            <div className="contact-entry" key={contact.id}>
              <span className="avatar">{contact.name.slice(0, 1)}</span>
              <div className="contact-details">
                <strong>{contact.name}</strong>
                {contact.description && <span className="small muted">{contact.description}</span>}
                <span className="address small">{contact.address}</span>
              </div>
              <div className="contact-actions">
                <button
                  className="icon-button"
                  aria-label={`Copy ${contact.name} address`}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(contact.address);
                      setCopied(contact.id);
                    } catch {
                      setError('Clipboard is unavailable. Select the full address to copy it.');
                    }
                  }}
                >
                  {copied === contact.id ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Edit ${contact.name}`}
                  disabled={disabled}
                  onClick={() => {
                    setEditing(contact.id);
                    setName(contact.name);
                    setAddress(contact.address);
                    setDescription(contact.description);
                    setError('');
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${contact.name}`}
                  disabled={disabled}
                  onClick={() => setDeleting(contact.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {deleting === contact.id && (
                <div className="delete-confirm small">
                  Remove {contact.name}?{' '}
                  <button
                    className="text-button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(contacts.filter((item) => item.id !== contact.id));
                      setDeleting(null);
                      if (editing === contact.id) reset();
                    }}
                  >
                    Remove contact
                  </button>
                  <button className="text-button" onClick={() => setDeleting(null)}>
                    Keep
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <form className="contact-form" onSubmit={save}>
          <h3>{editing ? 'Edit recipient' : 'Add a recipient'}</h3>
          <label htmlFor="contact-name">Contact name</label>
          <input
            id="contact-name"
            placeholder="Ada"
            maxLength={32}
            required
            value={name}
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
          <label htmlFor="contact-address">Solana public address</label>
          <input
            id="contact-address"
            placeholder="Paste a reviewed public address"
            required
            maxLength={44}
            value={address}
            disabled={disabled}
            onChange={(event) => setAddress(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <label htmlFor="contact-description">
            Description <span className="muted">(optional)</span>
          </label>
          <input
            id="contact-description"
            placeholder="Design collaborator"
            maxLength={100}
            value={description}
            disabled={disabled}
            onChange={(event) => setDescription(event.target.value)}
          />
          {error && (
            <p role="alert" className="error-text small">
              {error}
            </p>
          )}
          <div className="button-row">
            <button
              className="button"
              disabled={disabled || (!editing && contacts.length >= 3)}
              type="submit"
            >
              <Plus size={15} />
              {editing ? 'Save changes' : 'Save recipient'}
            </button>
            {editing && (
              <button className="text-button" type="button" onClick={reset}>
                Cancel edit
              </button>
            )}
          </div>
          <p className="small muted">
            Public addresses only. Never enter a private key or recovery phrase.
          </p>
        </form>
      </div>
    </section>
  );
}
