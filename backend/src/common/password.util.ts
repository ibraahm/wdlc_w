import * as bcrypt from 'bcrypt';

/**
 * A valid bcrypt hash (cost 12) of a random throwaway string. Used to run a
 * real comparison when the supplied account doesn't exist, so login response
 * timing is the same whether or not the email is registered — closing a
 * user-enumeration side channel. No password will ever match it.
 */
const DUMMY_HASH = '$2b$12$jw100mR6HRnPlTgCMK2sk.JtkqDvb6k2aAbDplMLg/36UeNn6LICi';

/**
 * Constant-time-ish password check that always performs a bcrypt comparison.
 * Returns false (after a dummy compare) when no hash is provided.
 */
export async function verifyPassword(plain: string, hash?: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
