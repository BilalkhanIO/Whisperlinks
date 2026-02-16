# 🚀 How to Push WhisperLink to GitHub

This guide will help you upload your code to GitHub. You can use the included automated scripts or follow the manual steps below.

## ✅ Prerequisites

1.  **Git Installed**: You must have Git installed on your computer.
    *   Check: Open terminal/command prompt and type `git --version`.
    *   Install: [Download Git](https://git-scm.com/downloads)
2.  **GitHub Account**: You need an account at [github.com](https://github.com/).
3.  **Empty Repository**:
    *   Go to [github.com/new](https://github.com/new).
    *   Name it `whisperlink` (or whatever you like).
    *   **IMPORTANT**: Do *not* check "Initialize with README", "Add .gitignore", or "Add license". Keep it completely empty.
    *   Click **Create repository**.

---

## 🤖 Method 1: Automated Scripts (Easiest)

### Windows Users
1.  Look for the file `push-to-github.ps1` in your project folder.
2.  Right-click the file and select **"Run with PowerShell"**.
3.  Paste your GitHub Repository URL when asked (e.g., `https://github.com/yourname/whisperlink.git`).
4.  The script will handle the rest!

### Mac / Linux Users
1.  Open your terminal.
2.  Navigate to the project folder.
3.  Make the script executable:
    ```bash
    chmod +x push-to-github.sh
    ```
4.  Run the script:
    ```bash
    ./push-to-github.sh
    ```
5.  Paste your Repository URL when prompted.

---

## 🛠️ Method 2: Manual Steps

If you prefer to do it yourself, open your terminal or command prompt in the project folder and run these commands one by one:

1.  **Initialize Git:**
    ```bash
    git init
    ```

2.  **Add files to staging:**
    ```bash
    git add .
    ```

3.  **Commit the files:**
    ```bash
    git commit -m "Initial commit: WhisperLink v5.0 Ultimate"
    ```

4.  **Rename branch to main:**
    ```bash
    git branch -M main
    ```

5.  **Link your remote repository:**
    *Replace the URL below with your actual repository URL.*
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
    ```

6.  **Push to GitHub:**
    ```bash
    git push -u origin main
    ```

---

## 🚑 Troubleshooting

### "Authentication failed" or Password issues
GitHub no longer accepts account passwords for command line access.
*   **Solution**: You must use a **Personal Access Token**.
    1.  Go to GitHub Settings -> Developer Settings -> Personal Access Tokens -> Tokens (classic).
    2.  Generate a new token with `repo` scope.
    3.  Copy the token.
    4.  When terminal asks for a password, paste this token.

### "Remote origin already exists"
*   **Solution**: Run `git remote remove origin` and try step 5 again.

### "Repository not found"
*   **Solution**: Check that you created the repository on GitHub website first and that the URL is correct.

### "Permission denied (publickey)"
*   **Solution**: This means your SSH keys aren't set up. Use the HTTPS URL (starts with `https://`) instead of the SSH URL (starts with `git@`).
