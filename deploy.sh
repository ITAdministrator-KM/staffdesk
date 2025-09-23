#!/bin/bash

# StaffDeskDSK Firebase Deployment Script
# This script builds and deploys the application to Firebase

echo "🚀 Starting StaffDeskDSK deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ You are not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run export

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Firebase (excluding functions to work with free plan)
echo "🌐 Deploying to Firebase (Hosting + Firestore rules only)..."
firebase use staffdeskdsk
firebase deploy --only hosting,firestore:rules

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "Your application is available at: https://staffdeskdsk.web.app"
    echo "Firebase Console: https://console.firebase.google.com/project/staffdeskdsk/overview"
    echo ""
    echo "📝 Note: Functions are excluded from deployment to support Firebase free plan."
    echo "    Advanced user deletion will be handled client-side."
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi