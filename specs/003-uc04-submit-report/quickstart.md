# Quickstart: UC-04 Mengirim Laporan

```bash
# 1. Daftar dan masuk sebagai Pelapor (kanal android) untuk mendapat token
curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Budi","phoneNumber":"081234567890","password":"rahasia123"}'
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"081234567890","password":"rahasia123","channel":"android"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')

# 2. Kirim laporan (foto apa saja; koordinat di Kecamatan Sekadau Hilir)
curl -X POST http://localhost:3000/api/reports -H "Authorization: Bearer $TOKEN" \
  -F photo=@foto.jpg -F deviceLat=0.17643 -F deviceLng=110.92919 -F gpsAccuracy=8 \
  -F description="Asap tebal di kebun" -F clientId=draf-001
# → 201 {"message":"Laporan LA-0001 terkirim, sedang diverifikasi","report":{...}}
```

Di Postman/Bruno: Body → form-data, kolom `photo` bertipe File, kolom lain Text, header `Authorization: Bearer <token>`.
Kontrak lengkap: `contracts/openapi.yaml`.
