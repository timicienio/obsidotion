import {
	Notice,
	requestUrl,
	TFile,
	normalizePath,
	stringifyYaml,
} from "obsidian";
import ObsidianSyncNotionPlugin from "../main";

import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import {
	SupportedRequestInfo,
	SupportedRequestInit,
} from "@notionhq/client/build/src/fetch-types";

export class DownloadFromNotion {
	plugin: ObsidianSyncNotionPlugin;
	notionClient: Client;
	n2m: NotionToMarkdown;

	constructor(plugin: ObsidianSyncNotionPlugin) {
		this.plugin = plugin;
		this.notionClient = new Client({
			auth: this.plugin.settings.notionAPI,
			fetch: async (
				url: SupportedRequestInfo,
				init?: SupportedRequestInit
			) => {
				const { text, status, headers } = await requestUrl({
					url,
					...init,
				});
				return {
					ok: status.toString().at(0) === "2",
					headers,
					text: () => Promise.resolve(text),
					status,
				};
			},
		});
		this.n2m = new NotionToMarkdown({ notionClient: this.notionClient });
	}

	async syncAllNotes() {
		const res = await this.notionClient.databases.query({
			database_id: this.plugin.settings.importDatabaseID,
		});

		if (res) {
			await Promise.all(
				res.results.map((page) => this.downloadPage(page))
			);
		}
	}

	async downloadPage(page: any) {
		const properties = page.properties;
		const titleProperty = properties.Name;

		try {
			if (
				!titleProperty ||
				!titleProperty.title ||
				!titleProperty.title.length ||
				!titleProperty.title[0].text
			) {
				return;
			}

			const fullTitle = titleProperty.title[0].text.content;

			const filePath = fullTitle;

			const mdblocks = await this.n2m.pageToMarkdown(page.id);
			const markdown = this.n2m.toMarkdownString(mdblocks).parent;

			const normalizedFilePath = `${
				this.plugin.settings.importLocation
			}/${normalizePath(filePath)}.md`;
			const dirPath = normalizedFilePath.substring(
				0,
				normalizedFilePath.lastIndexOf("/")
			);

			if (!(await this.plugin.app.vault.adapter.exists(dirPath))) {
				await this.plugin.app.vault.adapter.mkdir(dirPath);
			}

			const existingFile =
				this.plugin.app.vault.getAbstractFileByPath(normalizedFilePath);

			const frontmatter = {
				link: `https://www.notion.so/${page.id.replace(/-/g, "")}`,
				...(properties.Tags && properties.Tags.multi_select
					? {
							tags: properties.Tags.multi_select.map(
								(tag: any) => tag.name
							),
					  }
					: {}),
			};
			const yamlContent = `---\n${stringifyYaml(
				frontmatter
			)}\n---\n${markdown}`;

			if (existingFile && existingFile instanceof TFile) {
				await this.plugin.app.vault.modify(existingFile, yamlContent);
				new Notice(`Updated file: ${normalizedFilePath}`);
			} else {
				await this.plugin.app.vault.create(
					normalizedFilePath,
					yamlContent
				);
				new Notice(`Created file: ${normalizedFilePath}`);
			}
		} catch (e) {
			new Notice(`Error creating file: ${e}`);
		}
	}
}
