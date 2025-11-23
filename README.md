# DOMjudge Submitter for VSCode

This extension allows contestants to **submit solutions directly to DOMjudge** without leaving Visual Studio Code. It supports secure credential storage, problem selection from the API, automatic language detection, and seamless submission through the official DOMjudge REST API.

### Demo

<video src="./media/output.mp4" autoplay loop muted playsinline></video>

## Features

### 1. Submit Code to DOMjudge

- Select a problem from the contest
- Extension detects the programming language automatically
- Sends the file via DOMjudge API
- Displays success or detailed error logs

### 2. Secure Credential Storage

- No need to re-enter credentials each time

### 3. Supports Linux ENV Variables or VSCode Settings

The extension reads settings in this order:

1. Linux environment variables
   DOMJUDGE_URL
   DOMJUDGE_CONTEST_ID
2. VSCode settings (`settings.json`):

```json
{
  "domjudge.url": "http://your-domjudge-url",
  "domjudge.contestId": "1"
}
```

### 4. Commands

1. #### Submit Current File

Command:
`domjudge submit Solution or the Icon`

Behavior:

- Prompts for username/password (first time only)
- Detects language
- Fetches problems list
- Submits code

2. #### Clear Saved Credentials
   Command:
   `domjudge remove save Credentials`

### Language Detection

This extension maps VSCode language IDs to DOMjudge language IDs:

| VSCode Language | DOMjudge Language |
| --------------- | ----------------- |
| cpp / cc / cxx  | cpp               |
| c               | c                 |
| py              | python3           |
| java            | java              |
