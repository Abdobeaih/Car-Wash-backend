# Mobile Car Care | Backend API

The REST API behind **Mobile Car Care**, a platform for booking car care services at the customer's location. Front end: [Car-Wash-fronend](https://github.com/Abdobeaih/Car-Wash-fronend); combined overview and full documentation: [Car-Wash](https://github.com/Abdobeaih/Car-Wash).

**Live frontend:** https://mobilecarcare.vercel.app

## Management features

- Admin booking management and date-filtered analytics
- Payment status and amounts recorded manually by an admin, not an online payment gateway
- OTP SMS integration is implemented with Twilio. It requires valid server-side Twilio configuration; source code alone does not confirm that live SMS delivery is enabled.

## Stack

- NestJS (Express platform) + TypeScript
- MongoDB via `@nestjs/mongoose` (Mongoose)
- Authentication: JWT with Passport (`passport-jwt`), bcryptjs password hashing
- Validation: class-validator + class-transformer
- Security: Helmet, `@nestjs/throttler` rate limiting
- Notifications: Twilio (SMS) and Nodemailer (email)

## Getting started

```bash
npm install
# configure .env: MongoDB connection string, JWT secret, Twilio and SMTP keys
npm run start:dev
```

The compiled output in `dist/` is committed for reference; rebuild with `npm run build`.
