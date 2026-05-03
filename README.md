# Midterm Project - Firebase Chatroom

This project is a React + Firebase chatroom web app for the CS2410 Software Studio midterm project.

## Links

- GitHub: https://github.com/briannn0127/midterm-chatroom-project
- Firebase Hosting: 尚未部署，部署後補上

## Features

### Basic Components
- Email sign up and email sign in with Firebase Authentication.
- Firebase Hosting deployment support.
- Authenticated Firestore read/write.
- Responsive web design. The interface adapts to desktop and mobile sizes.
- Git-friendly project structure.
- Chatroom core features:
  - Create private chatrooms.
  - Invite registered members by email.
  - Send messages to other members.
  - Load all history messages in the current chatroom.
  - Realtime message update with Firestore snapshot listener.

### Advanced Components
- React framework.
- Google sign in.
- Chrome notification for unread messages.
- CSS animations: login card animation, modal animation, message entrance animation, replied-message highlight animation.
- XSS handling: message text is escaped before rendering.
- User profile page/modal:
  - Profile picture.
  - Username.
  - Email.
  - Phone number.
  - Address.
- Message operations:
  - Unsend own messages.
  - Edit own messages.
  - Search messages.
  - Send images.
  - Unsend own image messages.

### Bonus-Like Feature Included
- Reply to a specific message.
- The replied message is shown above the input when typing.
- The replied preview appears inside the sent message.
- Clicking the reply preview scrolls and highlights the original message.

## Local Setup Step by Step

### 1. Install Node.js
Install Node.js LTS from the official Node.js website.

Check installation:

```bash
node -v
npm -v
```

### 2. Install project dependencies

```bash
npm install
```

### 3. Create a Firebase project
1. Go to Firebase Console.
2. Create a new project.
3. Add a Web App.
4. Copy the Firebase config.

### 4. Enable Firebase services
Enable the following services in Firebase Console:

1. Authentication
   - Enable Email/Password provider.
   - Enable Google provider.
2. Cloud Firestore
   - Create a Firestore database.
3. Storage
   - Create Firebase Storage.
4. Hosting
   - Enable Firebase Hosting.

### 5. Configure Firebase
Open:

```txt
src/firebase/config.js
```

Replace the placeholder values with your Firebase Web App config.

Example:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 6. Run locally

```bash
npm run dev
```

Open the local URL shown in the terminal.

### 7. Test the website
Use two accounts to test the chatroom:

1. Register Account A.
2. Register Account B.
3. Account A creates a chatroom and invites Account B by email.
4. Send messages from both accounts.
5. Test image upload, edit, unsend, search, profile, reply, and notification.

## Firebase Deployment

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login

```bash
firebase login
```

### 3. Connect Firebase project

```bash
firebase use --add
```

Choose your project and set it as default.

### 4. Deploy

```bash
npm run deploy
```

After deployment, Firebase will show your hosting URL.

## Submission Notes

Before submission:

1. Run:

```bash
npm run build
```

2. Make sure the deployed Firebase page works correctly.
3. Make sure `index.html` exists.
4. Do not include `node_modules` in the zip file.
5. Include `README.md`.
6. Include `AI_reference.pdf` if AI tools were used.
7. Compress files as:

```txt
Midterm_Project_學號.zip
```

8. Generate MD5 checksum.
9. Upload the zip to FTP.
10. Submit MD5, website link, and GitHub URL to eeclass.

## Important Implementation Notes

- Only the sender can edit or unsend their own messages.
- User input is escaped before display to reduce XSS risk.
- Firestore rules are provided in `firestore.rules` as a recommended starting point.
- Storage rules are provided in `storage.rules` as a recommended starting point.
- For final submission, verify rules and permissions with multiple test accounts.
