const vscode = require("vscode");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const time = 3500;

// const config = vscode.workspace.getConfiguration("domjudge");

// ============ CONFIG ============
function getConfig() {
  // read OS environment variables
  const envUrl = process.env.DOMJUDGE_URL;
  const envContestId = process.env.DOMJUDGE_CONTEST_ID;

  const vscodeConfig = vscode.workspace.getConfiguration("domjudge");

  return {
    // priority: Linux env > VSCode settings
    url: envUrl || vscodeConfig.get("url"),
    contestId: envContestId || vscodeConfig.get("contestId"),
  };
}

const DOMJUDGE_URL = getConfig().url;
const CONTEST_ID = getConfig().contestId;
const API_URL = `${DOMJUDGE_URL}/api/v4/contests/${CONTEST_ID}`;

//const DOMJUDGE_URL = "http://127.0.0.1:12345";
//const CONTEST_ID = "1";

// ======================================================
//  SAVE USERNAME + PASSWORD
// ======================================================
async function saveCredentials(context) {
  const username = await vscode.window.showInputBox({
    title: "Enter DOMjudge Username",
    prompt: "Your team username",
    ignoreFocusOut: true,
  });

  const password = await vscode.window.showInputBox({
    title: "Enter DOMjudge Password",
    prompt: "Your team password",
    ignoreFocusOut: true,
    //password: true,
  });

  if (!username || !password) {
    vscode.window.showErrorMessage("Username and Password are required.");
    return;
  }

  await context.secrets.store("domjudge-username", username);
  await context.secrets.store("domjudge-password", password);

  vscode.window.showInformationMessage("Credentials saved securely!", time);
}

// MAP FOR LANGUAGE
function detectLanguageId(filePath) {
  //const ext = filePath.split('.').pop().toLowerCase();
  const ext = filePath;
  const map = {
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    python: "python3",
    py: "python3",
    java: "java",
  };

  return map[ext] || null;
}

// ======================================================
// REMOVE ALL CREDENTIALS
// ======================================================
async function removeCredentials(context) {
  await context.secrets.delete("domjudge-username");
  await context.secrets.delete("domjudge-password");
  vscode.window.showInformationMessage("Credentials removed.", time);
}

// ======================================================
// FETCH PROBLEMS LIST FOR QUICK PICK
// ======================================================
async function getProblems() {
  try {
    const response = await axios.get(`${API_URL}/problems?strict=false`);
    return response.data.map((p) => ({
      label: p.short_name,
      description: p.name,
      id: p.id,
    }));
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to fetch problems: ${err?.response?.status || err}`
    );
    return [];
  }
}

// ======================================================
// SUBMIT SOLUTION
// ======================================================
async function submitSolution(
  username,
  password,
  fileTxt,
  fileName,
  filePath,
  problemId,
  langId
) {
  if (!fileTxt || !filePath) {
    vscode.window.showErrorMessage("No file found to submit.");
    return;
  }

  vscode.window.showInformationMessage("Submitting...", time);

  const form = new FormData();

  form.append("problem", problemId);
  form.append("language", langId);

  const filename = path.basename(filePath);
  form.append("code", fs.createReadStream(filePath), filename);

  try {
    const res = await axios.post(`${API_URL}/submissions?strict=false`, form, {
      auth: { username, password },
      headers: form.getHeaders(),
    });

    vscode.window.showInformationMessage("Submission successful!", time);
    console.log(res.data);
  } catch (err) {
    const status = err?.response?.status || "Unknown";

    vscode.window
      .showErrorMessage(
        `❌ Submission failed (HTTP ${status})`,
        "Copy Error",
        "Show Details"
      )
      .then((choice) => {
        if (choice === "Copy Error") {
          vscode.env.clipboard.writeText(JSON.stringify(err, null, 2));
        }

        if (choice === "Show Details") {
          const out = vscode.window.createOutputChannel(
            "DOMjudge Submission Error"
          );
          out.appendLine(JSON.stringify(err, null, 2));
          out.show();
        }
      });
  }
}

// ======================================================
// MAIN EXTENSION ACTIVATION
// ======================================================
function activate(context) {
  const submitCmd = vscode.commands.registerCommand(
    "domjudge.runAction",
    async () => {
      let username = await context.secrets.get("domjudge-username");
      let password = await context.secrets.get("domjudge-password");

      if (!username || !password) {
        await saveCredentials(context);
        username = await context.secrets.get("domjudge-username");
        password = await context.secrets.get("domjudge-password");
        if (!username || !password) return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No file open.");
        return;
      }

      const fileTxt = editor.document.getText();
      const filePath = editor.document.uri.fsPath;
      const fileName = path.basename(filePath);
      //const langId = editor.document.languageId;

      const langId = detectLanguageId(editor.document.languageId);
      if (!langId) {
        vscode.window.showErrorMessage("Unsupported file type for submission.");
        return;
      }

      const problems = await getProblems();
      if (!problems.length) return;

      // Choose problem
      const selected = await vscode.window.showQuickPick(problems, {
        placeHolder: "Pick a problem to submit",
      });

      if (!selected) return;

      // Confirm
      const confirm = await vscode.window.showQuickPick(
        [
          { label: "Submit", description: `Submit ${fileName}` },
          { label: "Cancel" },
        ],
        {
          placeHolder: `Confirm submission\nProblem: ${selected.label}\nLanguage: ${langId}`,
        }
      );

      if (!confirm || confirm.label === "Cancel") return;

      await submitSolution(
        username,
        password,
        fileTxt,
        fileName,
        filePath,
        selected.id,
        langId
      );
    }
  );

  const removeCmd = vscode.commands.registerCommand(
    "domjudge.clearCredentials",
    async () => {
      await removeCredentials(context);
    }
  );

  context.subscriptions.push(submitCmd, removeCmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
