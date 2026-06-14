'use client';

import { useState, useTransition } from 'react';
import type { AdminUser, RegionalOffice } from '@/lib/api';
import { inviteUserAction, setUserActiveAction } from '@/lib/actions';

const ROLES = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR', 'REGIONAL_OFFICER'];
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', COMPLIANCE_OFFICER: 'Compliance Officer', MANAGER: 'Manager',
  EDITOR: 'Editor', REGIONAL_OFFICER: 'Regional Officer',
};

interface UserRowProps {
  user: AdminUser;
  onToggle: (id: string, active: boolean) => void;
}

function UserRow({ user, onToggle }: UserRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleToggle() {
    const newActive = !user.active;
    startTransition(async () => {
      const result = await setUserActiveAction(user.id, newActive);
      if (result.ok) {
        onToggle(user.id, newActive);
      } else {
        setError(result.error ?? 'Update failed');
      }
    });
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{user.name}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.active !== false
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {user.active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        {error && <span className="text-red-500 text-xs mr-2">{error}</span>}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`text-sm font-medium disabled:opacity-50 transition-colors ${
            user.active !== false
              ? 'text-gray-500 hover:text-red-600'
              : 'text-green-600 hover:text-green-800'
          }`}
        >
          {isPending
            ? 'Updating...'
            : user.active !== false
              ? 'Deactivate'
              : 'Activate'}
        </button>
      </td>
    </tr>
  );
}

interface UsersManagerProps {
  initialUsers: AdminUser[];
  offices?: RegionalOffice[];
}

export default function UsersManager({ initialUsers, offices = [] }: UsersManagerProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [newRole, setNewRole] = useState('EDITOR');
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError('');
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      // Invite-only: the user sets their own password via an emailed link and
      // can also sign in with Google. No password is set by the admin.
      const result = await inviteUserAction(fd);
      if (result.ok) {
        setShowAdd(false);
        form.reset();
        setNewRole('EDITOR');
        window.location.reload();
      } else {
        setAddError(result.error ?? 'Invite failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">
            Admin users ({users.length})
          </h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAdd ? 'Cancel' : 'Invite user'}
          </button>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <UserRow key={user.id} user={user} onToggle={handleToggle} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Add new admin user</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  name="name"
                  required
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@worlddirectlink.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {newRole === 'REGIONAL_OFFICER' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Regional office *</label>
                <select
                  name="regionalOfficeId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select an office…</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.code} — {o.name} ({o.states || 'no states'})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">The officer will only see agents, applications, and training in this office&apos;s states.</p>
              </div>
            )}

            <p className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              We&apos;ll email this person a secure link to set their own password. They can also sign in with Google using this email — no password is set by you.
            </p>

            {addError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {addError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Sending…' : 'Send invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
