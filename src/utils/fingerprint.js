import { v4 as uuidv4 } from 'uuid'

const KEY = 'ns_fingerprint'

export function getFingerprint() {
  let fp = localStorage.getItem(KEY)
  if (!fp) { fp = uuidv4(); localStorage.setItem(KEY, fp) }
  return fp
}
