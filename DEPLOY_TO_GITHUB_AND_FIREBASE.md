# Pawscription: GitHub + Firebase Setup

Use GitHub Pages to host the website and Firebase for login/accounts/data.

## Files to Upload to GitHub

Upload these files and folders to your GitHub repository:

- `index.html`
- `src/main.js`
- `src/ui-controller.js`
- `firestore.rules`
- `DEPLOY_TO_GITHUB_AND_FIREBASE.md`

Do not upload the `work` folder.

## 1. Firebase Setup

1. Open Firebase Console: https://console.firebase.google.com
2. Open your `pawscription-1a81a` project.
3. Go to Authentication.
4. Open Sign-in method.
5. Enable Email/Password.
6. Go to Firestore Database.
7. Create a Firestore database if you have not already.
8. Open Firestore Rules.
9. Paste the contents of `firestore.rules`.
10. Publish the rules.

## 2. GitHub Setup

1. Go to https://github.com
2. Create a new repository named `pawscription`.
3. Upload the website files listed above.
4. Commit the files to the `main` branch.

## 3. Turn On GitHub Pages

1. Open your GitHub repository.
2. Go to Settings.
3. Go to Pages.
4. Under Build and deployment, choose:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/root`
5. Click Save.

GitHub will give you a website URL like:

`https://your-github-username.github.io/pawscription/`

## 4. Add GitHub Pages to Firebase

1. Go back to Firebase Console.
2. Open Authentication.
3. Go to Settings.
4. Open Authorized domains.
5. Add your GitHub Pages domain:

`your-github-username.github.io`

Do not include `https://` in the authorized domain.

## 5. Test the Website

1. Open your GitHub Pages URL.
2. Create a new account with an email and password.
3. Add a pet.
4. Add a medication.
5. Log out.
6. Log back in.

If the pet and medication data are still there, Firebase is working.

## Notes

The Firebase API key in `src/main.js` is okay to be visible in a website. It is not a password. The important protection is the Firestore security rules, which make sure each signed-in user can only read and write their own data.

For a boss demo, use a fresh test account and add a few polished sample medications before presenting.
