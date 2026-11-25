# Data Model: UC-03

Tidak ada tabel baru.

| Kelas | Atribut / operasi | Wujud |
|---|---|---|
| `User` | `isActive`, `role`, `policeSector`, `agency` | kolom yang sudah ada |
| `OfficerAccountService` | `list()`, `create(data)`, `update(id, data)`, `deactivate(id)`, `generateInitialPassword()` | `officer-service.ts` |

Butir akun: `id, name, phoneNumber, role, roleLabel, isActive, statusLabel, policeSector{id,name}, agency{id,name}, createdAt`.
