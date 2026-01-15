# Git Timestamp Manipulation (PoC)

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Security Research](https://img.shields.io/badge/Focus-Security%20Research-red) ![License](https://img.shields.io/badge/License-MIT-green)

**A Proof-of-Concept tool demonstrating the mutability of Git commit metadata and the unreliability of contribution metrics.**

[**Live Demo**](https://git-contribution-hack.vercel.app/) 

![Demo of the Tool](public/assets/screenshot-hero.png)

> **⚠️ DISCLAIMER: Educational Proof-of-Concept**
>
> This project demonstrates how Git commit timestamps are mutable client-side data and how contribution metrics can be easily spoofed. 
>
> **The intent of this project is to highlight why contribution graphs should NOT be used as a primary metric for developer evaluation or trust.**
> 
> This tool should only be used on private, disposable test repositories for educational purposes.


## The Security Concept: Why this works

Many platforms (including GitHub) rely on the `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` environment variables to populate contribution graphs. 

This project proves that without strict verification methods (like GPG signing or server-side timestamping), **Git history is not an immutable timeline of work.**

### Security Implications Demonstrated:
1.  **Metric Spoofing:** Shows how "Vanity Metrics" (green squares) can be generated programmatically without actual code contribution.
2.  **Trust Assumptions:** Highlights potential vulnerabilities in supply chain security. If a bad actor can backdate commits, they could potentially hide malicious code insertions within a timeline that appears "dormant" or "legacy."
3.  **Metadata Mutability:** Demonstrates that Git creates a graph of content, not a verified timeline of events.

## 🛠️ Technical Implementation

This application provides a visual interface to generate a batch script that exploits Git's environment variables to inject a specific pattern into the commit history.

### Core Features
*   **Visual State Management:** A React-based grid (53x7) to define the desired commit density state.
*   **Dynamic Scaling Algorithm:** Uses a "Differential Mode" to calculate commit deltas based on existing user history (via GraphQL API), ensuring the injected pattern scales relative to the user's actual activity.
*   **Batch Script Generation:** Programmatically generates a Bash script to execute `git commit --allow-empty` loop, injecting `GIT_AUTHOR_DATE` for specific timestamps.
*   **NextAuth Integration:** Authenticates with GitHub to fetch and overlay real contribution data (via GraphQL) to visualize the manipulation against a real-world baseline.

---

## 📸 Visualization

### The Editor
![Screenshot of the tool demonstrating pattern injection](public/assets/screenshot-demo.png)

---

##  Usage (Strictly for Research/Testing)

This tool generates a shell script (`.sh`) to be run locally.

### 1. Configuration
Go to the website, select the year, and start painting. You can use the **Text Tool** to write messages or the **Brush** to draw manually.

### 2. Export the Script
Click **Download Script**. You will get a file named `git-art.sh`.

### 3. Run it Safely (The "Disposable Repo"/Sandboxed Environment)
**⚠️ WARNING:** Do not run this inside your actual work or project repositories. It generates hundreds of empty commits.

1.  Create a **New, Empty Repository** on GitHub (e.g., `my-git-test-repo`).
2.  Create a new folder on your computer and move the script there.
3.  Open your terminal in that folder.

**For Mac/Linux:**
```bash
chmod +x git-art.sh
./git-art.sh
```
**For Windows (Git Bash):**

```Bash
./git-art.sh
```
**Push to GitHub**

Once the script finishes generating the commits:
```Bash
git remote add origin https://github.com/YOUR_USERNAME/my-art-repo.git
git branch -M main
git push -u origin main
```
Wait 10-30 seconds, refresh your GitHub profile, and enjoy your art! 

##  Local Development
Want to add new patterns or icons?

**Clone the repo**

```Bash
git clone https://github.com/TanYuanXiangElroy/git-contribution-hack.git
cd git-contribution-hack
Install dependencies
```
```Bash
npm install
```
**Setup Environment Variables** (If you want to do the git history import localy)
Create a `.env.local` file:

```Bash
GITHUB_ID=your_oauth_client_id
GITHUB_SECRET=your_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_random_string
```
---
### 🔑 How to get GitHub OAuth Keys

To allow the "Connect GitHub" button to work locally, you need to register a developer app with GitHub.

<details>
<summary><strong>Click to show step-by-step instructions</strong></summary>

1.  Log in to GitHub.
2.  Go to setting at the top right
3.  Then at the bottom left **[Developer Settings > OAuth Apps](https://github.com/settings/developers)**.

4.  Click **"New OAuth App"**.
5.  Fill in the form with these exact details for `local testing`:
    *   **Application Name:** `Git Contribution Hack (Local)`
    *   **Homepage URL:** `http://localhost:3000`
    *   **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
6.  Click **Register application**.
7.  On the next screen:
    *   Copy the **Client ID** → paste this as `GITHUB_ID` in your `.env.local`.
    *   Click **Generate a new client secret**.
    *   Copy the **Client Secret** → paste this as `GITHUB_SECRET` in your `.env.local`.
    * `NEXTAUTH_SECRET` can be any long string

</details>


---
**Run the server localy**

```Bash
npm run dev
```

#  Disclaimer
This software is open source under the MIT License.


* This tool is for **educational** and *aesthetic* purposes only.
* Do not use this to deceive employers or lie about your work history.
* Commits are generated with `--allow-empty`, so no actual code is changed, but it will clutter your commit history list.

**Always use a private, disposable repository.**


