# Midterm Project - Firebase Chatroom

This project is a React + Firebase real-time chatroom web application developed for the CS2410 Software Studio Midterm Project.

---

# Project Links

- GitHub Repository: https://github.com/briannn0127/midterm-chatroom-project
- Firebase Hosting: https://chatroom-midterm-e6701.web.app

---

# Features

## Basic Components

- Email sign up and sign in using Firebase Authentication
- Firebase Hosting deployment
- Authenticated Firestore read/write
- Responsive web design (desktop and mobile support)
- Git-based project management structure

### Chatroom Core Features

- Create private chatrooms
- Invite registered users by email
- Realtime messaging
- Load complete chat history
- Firestore realtime snapshot updates

---

# Advanced Components

## Framework

- Built with React + Vite

## Authentication

- Email/password login
- Google sign in

## Chrome Notification

- Supports unread message notifications
- Notifications are only triggered when the page is not focused

## CSS Animations

The project includes several CSS animations:

- Login card animation
- Modal animation
- Message entrance animation
- Reply highlight animation
- Button transition animations

## XSS Protection

- User message input is escaped before rendering
- Prevents basic script injection and HTML injection

## User Profile System

Each user has an editable profile modal including:

- Profile picture
- Username
- Email
- Phone number
- Address

## Message Features

- Edit own messages
- Unsend own messages
- Search messages
- Send image messages
- Unsend image messages

---

# Bonus Components

## Reply to Specific Message

- Users can reply to any message
- The replied message preview appears above the input box
- Reply previews are displayed inside sent messages
- Clicking the reply preview scrolls to and highlights the original message

## Emoji Reactions

Supported reactions:

- 👍
- ❤️
- 😂

Features:

- Realtime reaction count updates
- Toggle reactions by clicking again

## Block User

- Users can block or unblock other users
- Blocked users' messages are mutually hidden in group chats
- Direct chats become disabled after blocking

---

# Image Upload Implementation

- Images are compressed on the client side
- Images are stored directly inside Firestore as Data URLs
- Firebase Storage is not required in the current version

---

# Responsive Design

The website supports responsive layouts for:

- Desktop
- Tablet
- Mobile devices

Responsive fixes include:

- Mobile room list layout
- Mobile composer layout
- Adaptive modal layout
- Compact toolbar behavior

---

# Local Setup

## 1. Install Node.js

Install the latest LTS version of Node.js.

Verify installation:

```bash
node -v
npm -v