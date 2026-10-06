# N M Creator Account (PWA)

Plain HTML/CSS/JS. No build step. Firebase Auth (Email/Password) + Cloud Firestore.

## Files
index.html, styles.css, app.js, firebase-config.js (YOUR config goes here), manifest.json, sw.js, icons/, firestore.rules, firebase.json

## 1. Firebase setup (free Spark plan, no billing)
1. console.firebase.google.com > Add project (turn Google Analytics off).
2. Build > Authentication > Get started > Sign-in method > enable **Email/Password**.
3. Build > Firestore Database > Create database > production mode > pick a region.
4. Firestore > Rules tab > paste the contents of `firestore.rules` > Publish.
5. Project settings (gear) > Your apps > Web (</>) > register app > copy the config object.
6. Open `firebase-config.js` and replace every PASTE_... value with your own values.

## Firestore structure
users/{uid}/accounts/{id}
fields: id, userId, category (capcut_buddy_win | buddy_not_win | partner_account | apply_need),
accountName, dollarAmount (number, or null for apply_need), deviceName, createdAt, updatedAt (epoch ms).
Each record exists once; the "All Creator Account Centre" is just a combined view of this one collection.

## 2. Deploy (Firebase Hosting, free)
Needs a computer or a cloud shell (e.g. Firebase Studio, GitHub Codespaces, Cloud Shell):
    npm i -g firebase-tools
    firebase login
    firebase init    (choose Hosting + Firestore, use existing project, public dir ".", single-page app: No, do NOT overwrite index.html or firestore.rules)
    firebase deploy
You get https://YOUR_PROJECT_ID.web.app (HTTPS is required for PWA install).
Alternative: any static HTTPS host (Netlify, GitHub Pages, Cloudflare Pages). Then add that domain in Authentication > Settings > Authorized domains.

## 3. Install on Android
Open the https URL in Chrome > menu (⋮) > Install app / Add to Home screen.

## 4. Second phone
Install the same URL, tap Login, use the SAME app email and password. Records appear automatically and sync live both ways.
(Use Login on phone 2, not Sign Up.)

## 5. Backup / restore
Settings > Backup Data (or Export JSON / CSV) saves a file to Downloads.
Settings > Restore Data > pick the .json file > review the confirmation > Restore.
Restore only adds new IDs and updates records when the backup copy is newer. It never deletes anything.
Backups contain only record fields: no passwords, OTPs, recovery codes or tokens.
