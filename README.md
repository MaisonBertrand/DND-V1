# DND-V1

A beautifully styled web application for managing D&D campaigns, built with React, Firebase, and TailwindCSS.

## Features

- 🎭 User Authentication (Email/Password)
- 📚 Campaign Management
- 👥 Party System
- 📝 Quest/Objective Tracking
- �� Fantasy-themed UI
- 💾 Character Presets (Save and reuse character configurations)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd DND-V1
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project and get your configuration:
- Go to the Firebase Console
- Create a new project
- Enable Authentication (Email/Password)
- Create a web app
- Copy the configuration

4. Create a `.env` file in the root directory and add your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Start the development server:
```bash
npm run dev
```

## Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

## Technologies Used

- React
- Firebase (Authentication & Firestore)
- TailwindCSS
- React Router
- Vite
- GitHub Pages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 