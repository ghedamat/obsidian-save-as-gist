import {App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {Octokit} from '@octokit/rest';

// Remember to rename these classes and interfaces!

interface SaveAsGistSettings {
	githubApiToken?: string;
}

const DEFAULT_SETTINGS: SaveAsGistSettings = {
	githubApiToken: null
}

export default class SaveAsGist extends Plugin {
	settings: SaveAsGistSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'save-as-new-gist',
			name: 'Save current file as a new private Gist',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const noteFile = view.file; // Currently Open Note
				const fileName = noteFile.name;
				if (!fileName) {
					return; // Nothing Open
				}

				// Read the currently open note file.
				const body = editor.getValue();

				await this._saveAsGist(fileName, body);
			}
		});

		this.addCommand({
			id: 'save-as-new-gist-selection',
			name: 'Save current selection as a new private Gist',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const noteFile = view.file; // Currently Open Note
				const fileName = noteFile.name;
				if (!fileName) {
					return; // Nothing Open
				}
				const body = editor.getSelection();

				await this._saveAsGist(fileName, body);
			}
		});

		this.addCommand({
			id: "save-as-new-updateable-gist",
			name: "Save current file as a new private, updatable Gist",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const noteFile = view.file; // Currently Open Note
				const fileName = noteFile.name;
				if (!fileName) {
					return; // Nothing Open
				}

				// Read the currently open note file.
				const body = editor.getValue();

				const gistMetadata = await this._saveAsGist(fileName, body);
				await this._prependGistMetadata(fileName, gistMetadata);
			}
		});

		this.addCommand({
			id: "update-existing-gist",
			name: "Update current file in existing private Gist",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const noteFile = view.file; // Currently Open Note
				const fileName = noteFile.name;

				if (!fileName) {
					return; // Nothing Open
				}

				const gistId = this.app.metadataCache.getCache(noteFile.path).frontmatter.gist_id
				if (!gistId) {
					new Notice('gist_id missing in file frontmatter');
					return;
				}

				// Read the currently open note file.
				const body = editor.getValue();

				const gistMetadata = await this._saveAsGist(fileName, body);
				await this._prependGistMetadata(fileName, gistMetadata);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SaveAsGistSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async _saveAsGist(fileName: string, body: string) {
		const token = this.settings.githubApiToken;

		if (!token) {
			new Notice('GitHub token not found, check your settings');
			return;
		}
		try {
			const octokit = new Octokit({
				auth: token
			});

			const result = await octokit.rest.gists.create({
				files: {
					[fileName]: {
						content: body
					}
				}
			})

			const url = result.data.html_url;
			await navigator.clipboard.writeText(url);

			new Notice(`Gist created ${url} - URL copied to your clipboard`);

			let splitUrl = url.split("/");
			let gistId = splitUrl[splitUrl.length - 1]

			return {gistId: gistId, gistUrl: url}
		} catch (err) {
			new Notice('There was an error creating your gist, check your token and connection');
			throw err;
		}

	}

	async _prependGistMetadata(tFile, gistMetadata) {
		this.app.fileManager.processFrontMatter(tFile, 
			(frontmatter) => {
			  frontmatter.gist_id = gistMetadata.gistId;
			  frontmatter.gist_url = gistMetadata.gistUrl
			});
	}

	async _updateAsGist(gistId, fileName, body) {
		const token = this.settings.githubApiToken;
	if (!token) {
	  new import_obsidian.Notice("GitHub token not found, check your settings");
	  return;
	}

	try {
	  const octokit = new Octokit2({
		auth: token
	  });
	  const result = yield octokit.rest.gists.update({
		gist_id: gistId,
		files: {
		  [fileName]: {
			content: body
		  }
		}
	  });

	  const url = result.data.html_url;
	  yield navigator.clipboard.writeText(url);
	  new Notice(`Gist updated ${url} - URL copied to your clipboard`);
	} catch (err) {
	  new Notice("There was an error creating your gist, check your token and connection");
	  throw err;
	}}
}

class SaveAsGistSettingTab extends PluginSettingTab {
	plugin: SaveAsGist;

	constructor(app: App, plugin: SaveAsGist) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Save As Gist'});

		new Setting(containerEl)
			.setName('Github API token')
			.setDesc('create a token here https://github.com/settings/tokens/new (only gist permission required)')
			.addText(text => text
				.setPlaceholder('Enter your Github API token')
				.setValue(this.plugin.settings.githubApiToken)
				.onChange(async (value) => {
					this.plugin.settings.githubApiToken = value;
					await this.plugin.saveSettings();
				}));
	}
}
