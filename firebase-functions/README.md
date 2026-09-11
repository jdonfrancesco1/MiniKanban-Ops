# Firebase Cloud Functions for MiniKanban

This directory contains the Cloud Functions needed for the MiniKanban app.

## Notification Function

The `sendNotification` function is triggered when a new document is added to the `notifications` collection. It sends SMS notifications to board members using Firebase's Admin SDK.

### Setup Instructions

1. Install Firebase CLI:
\`\`\`bash
npm install -g firebase-tools
