# WhisperLink GitHub Automation Script (Windows)

Write-Host "🚀 Starting GitHub Push Automation for WhisperLink..." -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Git is not installed." -ForegroundColor Red
    exit
}

if (Test-Path ".git") {
    Write-Host "📂 Existing repository detected." -ForegroundColor Yellow
    
    $commitMsg = Read-Host "Enter commit message (Press Enter for 'Update')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Update" }

    Write-Host "➕ Adding changes..." -ForegroundColor Yellow
    git add .
    
    Write-Host "💾 Committing..." -ForegroundColor Yellow
    git commit -m "$commitMsg"
    
    Write-Host "🚀 Pushing..." -ForegroundColor Cyan
    git push
} else {
    $repoUrl = Read-Host "Paste new GitHub Repository URL"
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "❌ No URL provided." -ForegroundColor Red
        exit
    }

    git init
    git add .
    git commit -m "Initial commit: WhisperLink v4.0 Ultra"
    git branch -M main
    git remote add origin $repoUrl
    git push -u origin main
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR." -ForegroundColor Red
}

Read-Host "Press Enter to close..."
