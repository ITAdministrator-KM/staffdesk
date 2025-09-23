#!/bin/bash

# Script to deploy Firestore rules and update admin panel

echo "🔧 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    exit 1
fi

# Deploy Firestore rules
echo "📤 Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
    echo ""
    echo "🎉 Admin Panel CRUD operations are now enabled!"
    echo ""
    echo "📋 Features available:"
    echo "   ✓ Create, Read, Update, Delete Users"
    echo "   ✓ Create, Read, Update, Delete Divisions"
    echo "   ✓ Proper validation and error handling"
    echo "   ✓ Loading states and accessibility improvements"
    echo ""
    echo "🔒 Security:"
    echo "   ✓ Only authenticated users can perform operations"
    echo "   ✓ Admin/HOD roles required for user/division management"
    echo ""
    echo "🚀 Ready to use! Navigate to /admin to test the CRUD operations."
else
    echo "❌ Failed to deploy Firestore rules. Please check the error above."
    exit 1
fi