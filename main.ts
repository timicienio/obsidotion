import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { Upload2Notion } from "./src/Upload2Notion";
import { DownloadFromNotion } from "./src/DownloadFromNotion";

interface PluginSettings {
	notionAPI: string;
	importDatabaseID: string;
	exportDatabaseID: string;
	proxy: string;
	importLocation: string;
	exportLocation: string;
	allowTags: boolean;
	importTags: string;

	lastImportedTime: Date;
	lastExportedTime: Date;
}

const DEFAULT_SETTINGS: PluginSettings = {
	notionAPI: "",
	importDatabaseID: "",
	exportDatabaseID: "",
	proxy: "",
	importLocation: "/",
	exportLocation: "/",
	allowTags: false,
	importTags: "",

	lastImportedTime: new Date(0),
	lastExportedTime: new Date(0),
};

export default class ObsidianSyncNotionPlugin extends Plugin {
	settings: PluginSettings;
	syncModal: Modal | null = null;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("upload-cloud", "Export to Notion", async () => {
			this.showSyncModal();
			await this.uploadAllNotes();
			this.closeSyncModal();
		});

		this.addRibbonIcon("download-cloud", "Import from Notion", async () => {
			this.showSyncModal();
			await this.downloadAllNotes();
			this.closeSyncModal();
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {}

	async uploadAllNotes() {
		const { notionAPI, exportLocation, exportDatabaseID, allowTags } =
			this.settings;
		if (!notionAPI || !exportDatabaseID) {
			new Notice(
				"Please set up the Notion API and Export Database ID in the settings tab."
			);
			return;
		}

		const upload = new Upload2Notion(this);
		const lastExportedTime = new Date(this.settings.lastExportedTime);
		const files = this.app.vault
			.getFolderByPath(exportLocation)
			?.children.filter((file) => file instanceof TFile)
			.filter((file) => {
				const lastModifiedTime = new Date(file.stat.mtime);

				return lastModifiedTime > lastExportedTime;
			});

		await Promise.all(
			files?.map((file) =>
				upload.syncMarkdownToNotion(file, allowTags)
			) ?? []
		);

		this.settings.lastExportedTime = new Date();
		await this.saveSettings();

		new Notice(
			`Notion import completed. ${files?.length ?? 0} files changed.`
		);
	}

	async downloadAllNotes() {
		const { notionAPI, importDatabaseID } = this.settings;
		if (!notionAPI || !importDatabaseID) {
			new Notice(
				"Please set up the Notion API and Import Database ID in the settings tab."
			);
			return;
		}

		const download = new DownloadFromNotion(this);
		await download.syncAllNotes();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	showSyncModal() {
		this.syncModal = new Modal(this.app);
		this.syncModal.titleEl.setText("Sync in progress");
		this.syncModal.contentEl.setText(
			"Please wait while the sync is in progress. This dialog will close automatically."
		);
		this.syncModal.modalEl.classList.add("sync-modal");
		this.syncModal.open();
	}

	closeSyncModal() {
		if (this.syncModal) {
			this.syncModal.close();
			this.syncModal = null;
		}
	}
}

class SettingTab extends PluginSettingTab {
	plugin: ObsidianSyncNotionPlugin;

	constructor(app: App, plugin: ObsidianSyncNotionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Notion API token")
			.setDesc("Enter your Notion API token.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Notion API token")
					.setValue(this.plugin.settings.notionAPI)
					.onChange(async (value) => {
						this.plugin.settings.notionAPI = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Import Database ID")
			.setDesc("Notion database ID to import from.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your database ID")
					.setValue(this.plugin.settings.importDatabaseID)
					.onChange(async (value) => {
						this.plugin.settings.importDatabaseID = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Export Database ID")
			.setDesc("Notion database ID to export to.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your database ID")
					.setValue(this.plugin.settings.exportDatabaseID)
					.onChange(async (value) => {
						this.plugin.settings.exportDatabaseID = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Import Location")
			.setDesc(
				"Directory where the imported notion pages will be located."
			)
			.addText((text) =>
				text
					.setPlaceholder("/")
					.setValue(this.plugin.settings.importLocation)
					.onChange(async (value) => {
						this.plugin.settings.importLocation = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Export Location")
			.setDesc(
				"Directory where the pages will be exported to notion database."
			)
			.addText((text) =>
				text
					.setPlaceholder("/")
					.setValue(this.plugin.settings.exportLocation)
					.onChange(async (value) => {
						this.plugin.settings.exportLocation = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Convert tags")
			.setDesc("Transfer the Obsidian tags to the Notion table.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.allowTags)
					.onChange(async (value) => {
						this.plugin.settings.allowTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Imported tags")
			.setDesc("Add tags to all imported Notion notes.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.importTags)
					.onChange(async (value) => {
						this.plugin.settings.importTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Force Import")
			.setDesc(
				"Force import all notes in configured Notion database, regardless of last edited time."
			)
			.addButton((button) =>
				button.setButtonText("Import").onClick(async () => {
					button.setDisabled(true);
					this.plugin.settings.lastImportedTime = new Date(0);
					await this.plugin.saveSettings();
					await this.plugin.downloadAllNotes();
					button.setDisabled(false);
				})
			);

		new Setting(containerEl)
			.setName("Force Export")
			.setDesc(
				"Force export all notes in configured Obsidian folder, regardless of last edited time."
			)
			.addButton((button) =>
				button.setButtonText("Export").onClick(async () => {
					button.setDisabled(true);
					this.plugin.settings.lastExportedTime = new Date(0);
					await this.plugin.saveSettings();
					await this.plugin.uploadAllNotes();
					button.setDisabled(false);
				})
			);
	}
}
