# StaffDeskDSK Firebase Deployment Script for Free Plan
# This script deploys only hosting and Firestore rules (no functions)

Write-Host "🚀 Starting StaffDeskDSK deployment (Free Plan Compatible)..." -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "❌ You are not logged in to Firebase. Please run:" -ForegroundColor Red
    Write-Host "firebase login" -ForegroundColor Yellow
    exit 1
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Blue
npm run export

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix the errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Deploy to Firebase (excluding functions to work with free plan)
Write-Host "🌐 Deploying to Firebase (Hosting + Firestore rules only)..." -ForegroundColor Blue
firebase use staffdeskdsk
firebase deploy --only hosting,firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deployment successful!" -ForegroundColor Green
    Write-Host "Your application is available at: https://staffdeskdsk.web.app" -ForegroundColor Cyan
    Write-Host "Firebase Console: https://console.firebase.google.com/project/staffdeskdsk/overview" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Note: Functions are excluded from deployment to support Firebase free plan." -ForegroundColor Yellow
    Write-Host "    Advanced user deletion will be handled client-side." -ForegroundColor Yellow
} else {
    Write-Host "❌ Deployment failed. Please check the errors above." -ForegroundColor Red
    exit 1
}