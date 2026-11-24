# Data Model: UC-02 Masuk ke Sistem (iterasi 2)

Migrasi `002_sectors_agencies.sql`.

### PoliceSector (`police_sectors`)
| Atribut | Kolom | Tipe |
|---|---|---|
| `id` | `id` | UUID PK |
| `name` | `name` | varchar(100) UNIQUE |

### Agency (`agencies`)
| Atribut | Kolom | Tipe |
|---|---|---|
| `id` | `id` | UUID PK |
| `name` | `name` | varchar(100) UNIQUE |
| `type` | `type` | varchar(50) (`FIRE_DEPARTMENT`, `BPBD`, `MANGGALA_AGNI`, `ENVIRONMENT_AGENCY`, `MILITARY`) |

### User (perubahan)
| Atribut baru | Kolom | Aturan |
|---|---|---|
| `policeSectorId` | `police_sector_id` UUID FK? | wajib untuk `SECTOR_OPERATOR` (CHECK) |
| `agencyId` | `agency_id` UUID FK? | wajib untuk `AGENCY_OFFICER` (CHECK) |

## Operasi baru (dari sequence diagram UC-02)

| Kelas | Operasi | Pesan sequence |
|---|---|---|
| `AuthService` | `login(identifier, password, channel): { token, user }` | `POST /api/auth/login` |
| `UserRepository` | `findByIdentifier(identifier)` | `findByPhoneOrEmail(identifier)` |
| `User` | `verifyPassword(password)` → `AuthService.verifyPassword(user, password)` | `verifyPassword(password)` |
| `User` | `canSignInFrom(channel)` | 3c |
| `AuthService` | `issueToken(userId, role)` | `issueToken(userId, role)` |
| `AuthService` | `verifyToken(token)` (plugin `authGuard`) | catatan "kapan saja" |
