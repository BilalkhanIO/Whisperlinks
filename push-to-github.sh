#!/bin/bash

# WhisperLink GitHub Automation Script (Mac/Linux)

echo "🚀 Starting GitHub Push Automation for WhisperLink..."

# 1. Check for Git
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed."
    exit 1
fi

# 2. Check if already a repo
if [ -d ".git" ]; then
    echo "📂 Existing Git repository detected."
    
    echo ""
    echo "Enter commit message (Press Enter for 'Update'):"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update"
    fi

    echo "➕ Adding files..."
    git add .

    echo "💾 Committing..."
    git commit -m "$COMMIT_MSG"

    echo "🚀 Pushing..."
    git push

else
    # New Repo Setup
    echo ""
    echo "Please create a NEW empty repository on GitHub."
    echo "Paste the URL here:"
    read -r REPO_URL

    if [ -z "$REPO_URL" ]; then
        echo "❌ Error: No URL provided."
        exit 1
    fi

    echo "📦 Initializing..."
    git init
    git add .
    git commit -m "Initial commit: WhisperLink v4.0 Ultra"
    git branch -M main
    git remote add origin "$REPO_URL"
    git push -u origin main
fi

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS!"
else
    echo "❌ ERROR: Push failed. Check your internet or permissions."
fi
