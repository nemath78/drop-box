# passlight — send photos between devices

A tiny web app: one device uploads photos, gets a 6-character code, the other
device enters the code and downloads them. Files auto-delete after 20 minutes.

## 1. Install prerequisites

- **VS Code**: download from https://code.visualstudio.com and install it.
- **Node.js** (includes npm): download the LTS version from https://nodejs.org
  and install it. After installing, confirm it worked by opening a terminal
  and running:
  ```
  node -v
  npm -v
  ```
  Both should print a version number.

## 2. Open the project in VS Code

1. Unzip this project folder somewhere on your computer (e.g. Desktop).
2. Open VS Code.
3. Go to **File > Open Folder** and select the unzipped `photo-share` folder.
4. Open the built-in terminal: **Terminal > New Terminal** (or `` Ctrl+` ``).

## 3. Install dependencies

In the VS Code terminal, run:
```
npm install
```
This downloads Express, Multer, and CORS into a `node_modules` folder.

## 4. Run the server

```
npm start
```
You should see:
```
Photo share server running at http://localhost:3000
```

## 5. Try it out

- Open http://localhost:3000 in one browser tab (or window) — this is "Device A".
- Upload a photo on the **Send** tab. You'll get a 6-character code.
- Open http://localhost:3000 in a second tab, or on your phone if it's on the
  same Wi-Fi network (see below) — this is "Device B".
- Enter the code on the **Receive** tab and download the photo.

### Testing across two real devices on the same Wi-Fi

`localhost` only works on the same computer. To test from your phone too:

1. Find your computer's local IP address:
   - Windows: run `ipconfig` in a terminal, look for "IPv4 Address" (e.g. `192.168.1.42`)
   - Mac/Linux: run `ifconfig` or `ip addr`, look for something like `192.168.1.42`
2. On your phone (connected to the **same Wi-Fi**), open a browser and go to
   `http://192.168.1.42:3000` (using your own IP).

## 6. How it works

- `server.js` — Express backend. Handles `/upload`, `/info/:code`, and
  `/download/:code/:index`. Files are saved to `temp-uploads/` and tracked
  in memory with an expiry timestamp; a timer deletes them automatically.
- `public/index.html` — the frontend, with a Send tab and a Receive tab.
- Nothing is stored permanently — everything is gone after 20 minutes
  (or sooner if you restart the server, since the file list lives in memory).

## 7. Changing the expiry time

In `server.js`, edit this line near the top:
```js
const EXPIRY_MS = 20 * 60 * 1000; // 20 minutes
```

## 8. Deploying it online (so it's not just localhost)

Once it works locally, you can deploy the whole thing (frontend + backend
together, since Express serves both) to a host with persistent disk, e.g.
**Render** or **Railway**:
1. Push this folder to a GitHub repo.
2. Create a new "Web Service" on Render/Railway pointing at that repo.
3. Set the start command to `npm start`.
4. Once deployed, you'll get a public URL you can open from any device,
   anywhere — not just the same Wi-Fi.
