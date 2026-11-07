'use client';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { CONTACTS_KEY, readHistory, type HistoryEntry } from '@/lib/history';
import { validateContacts, type Contact } from '@/lib/payments';

const CHANGE_EVENT = 'splitbrief-storage';
const subscribeToHydration = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}
export const PENDING_KEY = 'splitbrief.pending.v1';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
export function broadcastStorage() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function useStoredValue(key: string) {
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
export function useContacts(): {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  corrupted: boolean;
} {
  const raw = useStoredValue(CONTACTS_KEY);
  const data = useMemo(() => {
    try {
      return { contacts: validateContacts(JSON.parse(raw ?? '[]')), corrupted: false };
    } catch {
      return { contacts: [], corrupted: true };
    }
  }, [raw]);
  const setContacts = useCallback((contacts: Contact[]) => {
    window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(validateContacts(contacts)));
    broadcastStorage();
  }, []);
  return { ...data, setContacts };
}
export function useHistory(): HistoryEntry[] {
  const raw = useStoredValue('splitbrief.receipts.v1');
  return useMemo(() => readHistory({ getItem: () => raw }), [raw]);
}
