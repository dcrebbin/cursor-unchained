# Cursor Unchained

![Cursor Unchained Logo](src/lib/assets/cursor-unchained.png)

This project aims to reverse engineer [Cursor's Tab complete](https://cursor.com/docs/tab/overview) to enable it to be used in other IDEs.

Cursor's Tab complete is known to be the best tab complete on the market, however it's limited to only being available in Cursor which itself is tied down by Vscode's long history of technical debt. Cursor is focused on fixing these problems but why don't we unshackle the beast and bring the best tab complete to all!

Example Tab Completion

![Example Tab Completion](/assets/tabCompletionExample.png)

Example Tab Completion API Response
![Example StreamCpp API Response](/assets/tabCompletionApiResponse.png)

### Scripts

`bun run streamCpp`

![Example Tab Completion](/assets/streamCppExample.png)

`bun run refreshTabContext` [WIP]

(Workspace paths are encoded)

![Example Refresh Tab Context](/assets/refreshTabContextExample.png)

## Requirements

- Cursor Account

## Overview

**StreamCpp**: the main completion service that is used to send tab completion requests to the Cursor API.

**RefreshTabContext**: a context refresh service that is used to refresh the tab context which I believe is used to provide StreamCpp with more context for the tab completion request via codeblocks.

## Setup

1. Follow the below steps to get the environment variables for the StreamCpp/Tab Completion functionality

2. bun install

3. bun run dev

### Environment Variables (StreamCpp)

note: this is obviously a pain and quite brittle, I should find a better way to do this in the future.

1. Create a new file called `.env` in the root of the project. See `env.example` for the required variables.

2. Open Cursor

3. Cmd + Shift + P to open the Command Palette

4. Developer: Start Debugging Cursor Always Local Extension Host in a New Window (accept restart Cursor)

5. Developer: Open Developer Tools for Extension Host > LocalProcess pid... ext:always-local

6. Navigate to the Network tab

7. Trigger the tab completion request: in the Network tab this will appear as StreamCpp

8. Copy the bearer token, x-request-id, x-session-id and x-cursor-client-version

9. Copy the values and paste them into the `.env` file

Note: you can run `npx jwt-decode-cli <token>` to decode your CURSOR_BEARER_TOKEN and get the payload with the expiration date (which I estimate to be 1 - 2 months — but could be longer depending on when the token was last refreshed)

## Frontend

1. `bun run dev` to start the development server

2. Open the browser and navigate to `http://localhost:5173`

3. Start typing in the editor and the tab completion will be shown in the transparent editor

4. Press Tab to insert the tab completion into the editor

## Backend

1. `bun run dev` to start the development server

2. Run the following command to send a tab completion request

```bash
curl --location 'http://localhost:5173/api/streamCpp' \
--header 'Content-Type: application/json' \
--data '{
    "code":"function "
}'
```

## Scripts

### StreamCpp

1. `bun run streamCpp` to send a tab completion request

2. The response will be logged to the console

3. Edit payload.currentFile.contents to the code you want to tab complete in the `src/constants.ts` file

### Environment Variables (RefreshTabContext)

This requires looking through and debugging the source code via Help Tab > Toggle Developer Tools.
It's kind of a pain so I'll add it later.

### RefreshTabContext

1. `bun run refreshTabContext` to send a refresh tab context request

2. The response will be logged to the console
