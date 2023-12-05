import * as fs from 'fs';
import * as vscode from 'vscode';
import path = require('path');

type File = {
	basename: any;
	fsPath: string;
	basepath: any;
};

export function activate(context: vscode.ExtensionContext) {
	// Register the commands that are provided to the user
	var currentRenaming: { files: any; doc?: any; save?: any };

	let disposableRenameCommand = vscode.commands.registerCommand(
		'extension.renameBatch',
		(clickedFile, selectedFiles) => {
			if (!selectedFiles) {
				return;
			}

			currentRenaming = {
				files: [],
			};

			selectedFiles.forEach((file: File) => {
				file.basename = path.basename(file.fsPath);
				file.basepath = file.fsPath
					.split(file.basename)
					.slice(0, -1)
					.join(file.basename);
				currentRenaming.files.push(file);
			});

			let batchFilePath = path.join(__dirname, '.Batch Rename.txt');
			let content = currentRenaming.files
				.map((file: File) => file.basename)
				.join('\n');
			fs.writeFileSync(batchFilePath, content);

			var openPath = vscode.Uri.file(batchFilePath);

			vscode.workspace.openTextDocument(openPath).then((doc) => {
				currentRenaming.doc = doc;
				vscode.window.showTextDocument(doc).then((editor) => {});

				currentRenaming.save = function () {
					let newNames = doc
						.getText()
						.split(/[\r\n]+/)
						.filter((line) => !!line);

					if (currentRenaming.files.length === newNames.length) {
						currentRenaming.files.forEach((file: File, i: number) => {
							let num = 1;
							let newPath = file.basepath + newNames[i];
							if (file.fsPath === newPath) {
								return;
							}

							while (fs.existsSync(newPath)) {
								newPath =
									file.basepath +
									newNames[i].replace(/\.(?=[A-z0-9]*$)/, `_${num}.`);
								num++;
							}

							fs.renameSync(file.fsPath, newPath);
						});
					} else {
						vscode.window.showInformationMessage(
							'The line count does not match the file selection!',
						);
					}
					setTimeout(() => {
						vscode.commands.executeCommand(
							'workbench.action.closeActiveEditor',
						);
						fs.unlink(batchFilePath, (err) => {
							if (err) {
								console.error(err);
							}
						});
					}, 80);
				};
			});
		},
	);

	vscode.workspace.onWillSaveTextDocument((saveEvent) => {
		if (
			saveEvent.document === currentRenaming.doc &&
			saveEvent.reason === 1
		) {
			currentRenaming.save();
		}
	});
	// push to subscriptions list so that they are disposed automatically
	context.subscriptions.push(disposableRenameCommand);
}

// This method is called when extension is deactivated
export function deactivate() {}
