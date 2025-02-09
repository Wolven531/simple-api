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
import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, Express with TypeScript!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
```
