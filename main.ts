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
			callback: async () => {
				//new SampleModal(this.app).open();
				const noteFile = this.app.workspace.getActiveFile(); // Currently Open Note
				const fileName = noteFile.name;
				if (!fileName) {
					return; // Nothing Open
				}

				// Read the currently open note file.
				let body = await this.app.vault.read(noteFile);

				await this._saveAsGist(fileName, body);
			}
		});

		this.addCommand({
			id: 'save-as-new-gist-selection',
			name: 'Save current selection as a new private Gist',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				const noteFile = this.app.workspace.getActiveFile(); // Currently Open Note
				const fileName = noteFile.name;
				if (!fileName) {
					return; // Nothing Open
				}
				const body = editor.getSelection();

				this._saveAsGist(fileName, body);
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
		} catch (err) {
			new Notice('There was an error creating your gist, check your token and connection');
			throw err;
		}

	}
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
