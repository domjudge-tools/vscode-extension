const vscode = require("vscode");

const getData = async () => {
  const username = await vscode.window.showInputBox({
    title: "Enter DOMjudge Username",
    prompt: "Your team username",
    ignoreFocusOut: true,
  });
  const password = await vscode.window.showInputBox({
    title: "Enter DOMjudge Password",
    prompt: "Your team password",
    ignoreFocusOut: true,
  });
  // SAVE SECURELY
  await context.secrets.store("domjudge-username", username);
  await context.secrets.store("domjudge-password", password);
  vscode.window.showInformationMessage("Credentials saved securely!");
};

const removeData = async () => {
  await context.secrets.delete("domjudge-username");
  await context.secrets.delete("domjudge-password");
};

const fetchSub = async (TEAM_USER, TEAM_PASS, fileTxt, fileName, filePath) => {
  vscode.window.showInformationMessage("Start to submit");

  const axios = require("axios");
  const FormData = require("form-data");
  const fs = require("fs");
  const path = require("path");

  // ============ CONFIG ============
  const DOMJUDGE_URL = "http://127.0.0.1:12345";
  const CONTEST_ID = "1";
  // =================================

  async function submitSolution(problemId, languageId) {
    if (!fileTxt) {
      console.error("❌ File not found:", fileTxt);
      return;
    }
    vscode.window.showInformationMessage("Start to real submit");

    const url = `${DOMJUDGE_URL}/api/v4/contests/${CONTEST_ID}/submissions`;

    const form = new FormData();

    form.append("problem", problemId);
    form.append("language", languageId);

    const filename = path.basename(filePath);
    form.append("code", fs.createReadStream(filePath), filename);

    // form.append("files[]", Buffer.from(fileTxt), {
    //   fileName,
    //   contentType: "text/plain",
    // });

    try {
      const response = await axios.post(url, form, {
        auth: {
          username: TEAM_USER,
          password: TEAM_PASS,
        },
        headers: form.getHeaders(),
      });

      vscode.window.showInformationMessage("✅ Submission Response:");
      console.log(response.data);
    } catch (err) {
      vscode.window
        .showErrorMessage(
          `❌ Error: Status ${err.response?.status || "Unknown"}`,
          "Copy to Clipboard",
          "Show Full Details"
        )
        .then((selection) => {
          if (selection === "Copy to Clipboard") {
            vscode.env.clipboard.writeText(JSON.stringify(err, null, 2));
            vscode.window.showInformationMessage(
              "Error details copied to clipboard."
            );
          } else if (selection === "Show Full Details") {
            // Option: Open a webview or output channel for full error display
            const output = vscode.window.createOutputChannel("Error Details");
            output.appendLine(JSON.stringify(err, null, 2));
            output.show();
          }
        });
    }
  }

  // ============ CLI USAGE ============
  //   const [problem, language] = args;

  await submitSolution("1", "cpp");
};

// Main Function
function activate(context) {
  const cmd = vscode.commands.registerCommand(
    "myExtension.runAction",
    async () => {
      const username = await context.secrets.get("domjudge-username");
      const password = await context.secrets.get("domjudge-password");

      const fileTxt = vscode.window.activeTextEditor?.document.getText();
      //      const filePath = vscode.window.activeTextEditor?.document.uri;
      const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
      vscode.window.showInformationMessage(filePath);

      const fileName = vscode.window.activeTextEditor?.document.fileName
        .split("/")
        .pop();

      if (!username || !password) {
        vscode.window.showErrorMessage("Username is required.");
        await getData();
        return;
      }

      await fetchSub(username, password, fileTxt, fileName, filePath); // TEAM_USER, TEAM_PASS, fileTxt fileName filePath
      //      vscode.window.showInformationMessage(username, password);
    }
  );

  context.subscriptions.push(cmd);
}

function deactivate() {}

module.exports = { activate, deactivate };
