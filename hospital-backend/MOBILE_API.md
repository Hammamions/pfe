# Mobile Patient API (MVP)

Base URL: `/api`

Authentication:
- Send `Authorization: Bearer <token>` for protected endpoints.

## Auth

### `POST /auth/login`
Body:
```json
{ "email": "imen@gmail.com", "password": "azerty123" }
```
Success:
```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "email": "imen@gmail.com",
    "role": "PATIENT",
    "nom": "Hammami",
    "prenom": "Imen",
    "lastName": "Hammami",
    "firstName": "Imen"
  }
}
```

### `GET /auth/me`
Success:
```json
{
  "user": {
    "id": 1,
    "email": "imen@gmail.com",
    "role": "PATIENT",
    "nom": "Hammami",
    "prenom": "Imen",
    "birthDate": "",
    "bloodGroup": "",
    "allergies": [],
    "history": []
  }
}
```

## Patient

### `GET /patients/me/profile`
Returns full mobile profile DTO.

### `PUT /patients/me/profile`
Updates `firstName`, `lastName`, `phone`, medical and emergency fields.

### `GET /patients/me/dashboard`
Success:
```json
{
  "profile": { "id": 1, "patientId": 3, "firstName": "Imen", "lastName": "Hammami" },
  "summary": {
    "appointmentsCount": 3,
    "upcomingAppointmentsCount": 2,
    "documentsCount": 5,
    "notificationsCount": 4,
    "activePrescriptionsCount": 1
  }
}
```

### `GET /patients/me/documents?page=1&pageSize=20`
Paginated mobile document list.

### `GET /patients/me/notifications?page=1&pageSize=20`
Paginated notification list.

### `PATCH /patients/me/notifications/:id/read`
Marks one notification as read.

### `GET /patients/ordonnances`
Returns the authenticated patient’s prescriptions (`Ordonnance`), newest first, with prescribing doctor (`medecin.utilisateur`).

## Documents (patient)

`GET /api/documents` now merges **dossier** `Document` rows and **Ordonnance** rows into one list. Ordonnances appear with `id` like `ord_12`, `category: "ordonnance"`, `ordonnanceContenu` (JSON string from the doctor), and `isOrdonnance: true`.

## Professionals (médecin, Bearer pro token)

### `GET /professionals/prescription-patients`
Distinct patients who have (or had) a rendez-vous with the connected doctor. Used to populate the prescription UI.

### `POST /professionals/prescriptions`
Body:
```json
{
  "patientId": 3,
  "contenu": "{\"medications\":[{\"nom\":\"Doliprane\",\"dosage\":\"500mg\",\"frequence\":\"3x/jour\",\"duree\":\"5 jours\",\"instructions\":\"\"}],\"notes\":\"\",\"issuedAt\":\"2026-04-15T12:00:00.000Z\"}",
  "urlPdf": null
}
```
Creates an `Ordonnance`, notifies the patient, and the entry appears in mobile `GET /api/documents`.

## Appointments

### `GET /appointments/mine?page=1&pageSize=20&status=CONFIRME&from=2026-01-01&to=2026-12-31`
Paginated appointments list with optional filters.

### `POST /appointments`
Creates a patient appointment request.

### `PATCH /appointments/:id/cancel-request`
Creates a cancellation request.

### `PATCH /appointments/:id/reschedule-request`
Creates a reschedule request.

## Common errors

- `400` invalid payload / invalid id
- `401` missing or invalid token
- `404` resource not found
- `503` database unavailable
- `500` unexpected server error
