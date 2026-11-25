# Quickstart: UC-01

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi","phoneNumber":"081234567890","password":"rahasia123"}'
# → 201 {"user":{"id":"…","role":"CITIZEN",…}}
```
Uji Black Box: `bun test tests/blackbox/uc01-register.test.ts` (API harus berjalan dengan `API_URL`).
