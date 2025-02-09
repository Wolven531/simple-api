# Simple Express API

## Run API

1. Install deps (initial install and after adding new dependencies): `npm i`
1. Run API: `npm start`

## Build and Serve API

1. Install deps (initial install and after adding new dependencies): `npm i`
1. Build API: `npm run build`
1. Serve API: `npm run serve`

## Steps to create starter project

1. Create a new directory for the project: `mkdir simple-api`
1. Navigate to directory: `cd simple-api`
1. Initialize git repo: `git init`
1. Initialize npm: `npm init -y`
1. Install Express: `npm install express --save`
1. Install TypeScript and types: `npm install ts-node typescript @types/express @types/node --save-dev`
1. Generate TypeScript configuration: `npx tsc --init`
1. Alter `tsconfig.json` to output built files to `dist/`, set - `"outDir": "./dist"`

Add `.gitignore` file and ignore build files and node modules

```plaintext
dist
node_modules
```

Add scripts to `package.json`

```json
"build": "tsc",
"serve": "node dist/index.js",
"start": "ts-node src/index.ts"
```

Add initial code to `src/index.ts`

```typescript
import express, { Request, Response } from "express";

const app = express();
const port = 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Express with TypeScript!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

### Deploy With Render

1. Create [Render](https://render.com) account by linking GitHub account
1. Choose "Hobby" plan (free)
1. Add new "Web Service"
1. Select this repo from list
1. Configure
   - Language - `Node`
   - Branch - `main`
   - Region - `Oregon (US West)`
   - Leave "Root Directory" blank
   - Set "Build Command" - `npm install && npm run build`
   - Set "Start Command" - `node dist/index.js`
   - Choose "Free" Instance Type
1. Click "Deploy Web Service"
   - Requires card information to verify identity, will NOT charge anything
1. Wait for build to complete and refresh page
1. Click link at top of page (e.g. [https://simple-api-6ldz.onrender.com](https://simple-api-6ldz.onrender.com))
