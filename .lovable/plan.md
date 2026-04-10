

## Plan: Fix Build Errors, Announcement Dialog Re-render, View Mode Persistence, TextArea Whitespace, Team Restructure, Explorer Select Error

### 1. Fix Build Error — `whatsapp` not in User type

**File: `src/types/index.ts`** line ~46:
- Add `whatsapp?: string | null;` to `User` interface

### 2. Fix Announcement Dialog Re-rendering on Every Keystroke

**Problem**: The Announcement create/edit dialog likely re-renders because the parent list re-renders. The dialog `open` state depends on `createOpen || !!editItem`, and if the parent re-renders (e.g., due to state changes bubbling up), the dialog content remounts.

**Root cause**: The `formTitle`, `formContent`, etc. states trigger parent re-render, but since the dialog and the list are in the same component, this is normal React — the dialog should NOT close/re-mount. More likely issue: the dialog might be losing focus or the component key is changing.

**Fix — `src/pages/Announcements.tsx`**:
- Separate the create/edit dialog into its own stable component or ensure the Dialog doesn't unmount on state change
- Most likely fix: ensure the Dialog `key` is stable — check if `editItem` object reference changes on every render

### 3. Save Grid/Table View Mode to localStorage (All Pages)

**Files**: `src/pages/Team.tsx`, `src/pages/Explorer.tsx`, `src/pages/Tasks.tsx`, `src/pages/Vault.tsx`, `src/pages/Payslip.tsx`, `src/components/EmployeeGrid.tsx`

For each page:
- Initialize viewMode from `localStorage.getItem("viewMode_<page>")` instead of hardcoded default
- On viewMode change, save to `localStorage.setItem("viewMode_<page>", mode)`

### 4. TextArea Input — Preserve Newlines in Display

**Problem**: Text entered with Enter/newlines in textareas is stored correctly but displayed without line breaks (rendered as single line).

**Fix**: Everywhere textarea content is displayed in the UI, use `whitespace-pre-wrap` CSS class or render with `\n` → `<br/>` conversion.

**Files to update** (all places that display textarea content):
- `src/pages/Announcements.tsx` — content display (already uses ReactMarkdown, should work)
- `src/pages/Team.tsx` — description display
- `src/pages/Tasks.tsx` — task description display
- `src/components/TaskDetailModal.tsx` — description
- `src/pages/Notes.tsx` — note content
- `src/pages/Partner.tsx` — descriptions
- Any other dialog/card that shows textarea content → add `whitespace-pre-wrap` class

### 5. Team Restructure — Remove Supervisor, Multi-Admin (Leader → Admin)

**Changes**:

**Frontend — `src/pages/Team.tsx`**:
- Remove `newTeamSupervisors` state, `supervisorSearch`, `toggleSupervisor`, `setSupervisorSearch`
- Remove entire "Pengawas / Atasan" section (lines 537-571)
- Remove `supervisorIds` from create/update API calls
- Remove supervisor display in table and card views
- Change "Ketua Team" → "Admin Team" label
- Change `newTeamLeader` (single select) → `newTeamAdmins` (multi-select with checkboxes, same pattern as members)
- `leaderId` field becomes `leaderIds` (array) — or keep sending as `leaderId` but make it an array

**Backend — `backend/src/models/TeamGroup.js`**:
- Change `leaderId: String` → `leaderIds: [{ type: String }]`
- Remove `supervisorIds`

**Backend — `backend/src/services/teamService.js`**:
- Update references from `leaderId` to `leaderIds`
- Remove `supervisorIds` references

**Frontend — `src/types/index.ts`**:
- Change `leaderId?: string` → `leaderIds?: string[]`
- Remove `supervisorIds`

**Frontend — `src/pages/Tasks.tsx` / `CreateTaskDialog.tsx`**:
- When admin/leader creates team task, allow selecting multiple teams where the user is an admin (in `leaderIds`)

### 6. Fix Explorer "Sambungkan ke Mitra" Select Error

**Problem**: `<SelectItem value="">` — empty string value is not allowed by Radix Select.

**Fix — `src/pages/Explorer.tsx`** line 1096:
- Change `<SelectItem value="">` to `<SelectItem value="none">` 
- Update `handleLinkPartner` to treat `"none"` as no partner (send empty string to API)

---

### File Summary

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `whatsapp`, change `leaderId` → `leaderIds`, remove `supervisorIds` |
| `src/pages/Announcements.tsx` | Fix dialog re-render issue |
| `src/pages/Team.tsx` | Remove supervisor, multi-admin, rename to "Admin", localStorage viewMode |
| `src/pages/Explorer.tsx` | Fix SelectItem empty value, localStorage viewMode |
| `src/pages/Tasks.tsx` | Multi-team selection for admin, localStorage viewMode |
| `src/pages/Vault.tsx` | localStorage viewMode |
| `src/pages/Payslip.tsx` | localStorage viewMode |
| `src/components/EmployeeGrid.tsx` | localStorage viewMode |
| `src/components/CreateTaskDialog.tsx` | Multi-team selection |
| `src/components/TaskDetailModal.tsx` | whitespace-pre-wrap |
| `src/pages/Notes.tsx` | whitespace-pre-wrap |
| `src/pages/Partner.tsx` | whitespace-pre-wrap |
| `backend/src/models/TeamGroup.js` | `leaderIds` array, remove `supervisorIds` |
| `backend/src/services/teamService.js` | Update leader/supervisor refs |

### Order
1. Fix build errors (whatsapp type, SelectItem value)
2. Fix announcement dialog re-render
3. localStorage viewMode persistence (all pages)
4. whitespace-pre-wrap for textarea outputs (all pages)
5. Team restructure (remove supervisor, multi-admin)
6. Multi-team task creation

