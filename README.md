# SSSAM Academy - Admin Panel Design & API Integration

This folder contains the separate admin panel design for managing students, course applications, enquiries, certificates, and legacy database imports.

## Design Architecture
The Admin Panel is designed as a secure, premium SPA (Single Page Application). It includes:
1. **Glassmorphism Sidebar & Navigation**: Toggle dashboard categories: *Applications*, *Certificates*, *Enquiries*, and *Legacy Import*.
2. **Responsive Data Grids**: High-fidelity dark-mode layout with status badges.
3. **Session-Level Authentication**: Standard JWT checks redirect unauthenticated users to the Login view automatically.

---

## API Endpoints Used

### 1. Authentication
* **Endpoint**: `POST /api/admin/auth/login`
* **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "YOUR_PASSWORD"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "JWT_BEARER_TOKEN",
      "tokenType": "Bearer",
      "expiresIn": "30d"
    }
  }
  ```

### 2. Manage Applications
* **Get All Applications**: `GET /api/admin/applications`
  * *Headers*: `Authorization: Bearer JWT_BEARER_TOKEN`
* **Approve Application**: `PATCH /api/admin/applications/:applicationId/approve`
  * *Headers*: `Authorization: Bearer JWT_BEARER_TOKEN`
  * *Action*: Generates a unique certificate number matching `SSSAM/CERT/XXXXXX` format and triggers an automated email response to the student.
* **Reject Application**: `PATCH /api/admin/applications/:applicationId/reject`
  * *Headers*: `Authorization: Bearer JWT_BEARER_TOKEN`
  * *Request Body*:
    ```json
    { "remarks": "Reason for rejection" }
    ```

### 3. View Certificates
* **Get All Certificates**: `GET /api/admin/certificates`
  * *Headers*: `Authorization: Bearer JWT_BEARER_TOKEN`

### 4. Track Course Enquiries
* **Get All Enquiries**: `GET /api/admin/enquiries`
  * *Headers*: `Authorization: Bearer JWT_BEARER_TOKEN`

---

## Configuration & Setup

1. **Environment Variables**:
   Define variables in backend `.env` file:
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=yourpassword
   ADMIN_JWT_SECRET=yourjwtsecretkey
   ```
2. **Launch Integration**:
   - Serve the backend: `npm run dev` or `node src/server.js` (running on port `5000` or defined PORT).
   - Direct web traffic to the admin index (`http://localhost:5000/admin/` or open `index.html` on your web host).
