import { Notice, requestUrl, TFile, stringifyYaml } from "obsidian";
import { markdownToBlocks } from "@tryfabric/martian";
import ObsidianSyncNotionPlugin from "../main";

export class Upload2Notion {
	plugin: ObsidianSyncNotionPlugin;

	constructor(plugin: ObsidianSyncNotionPlugin) {
		this.plugin = plugin;
	}

	async syncMarkdownToNotion(file: TFile, allowTags: boolean) {
		const markdown = await this.plugin.app.vault.read(file);
		const frontmatter =
			this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		const content = markdown.split("---")[2] || "";
		const blocks = markdownToBlocks(content);

		const notionID = frontmatter?.notionID;
		const filePath = file.path;

		if (notionID) {
			await this.updatePage(
				notionID,
				file.basename,
				allowTags,
				frontmatter?.tags,
				blocks,
				filePath
			);
		} else {
			await this.createPage(
				file.basename,
				allowTags,
				frontmatter?.tags,
				blocks,
				file,
				markdown,
				filePath
			);
		}
	}

	async createPage(
		title: string,
		allowTags: boolean,
		tags: string[],
		blocks: any[],
		file: TFile,
		markdown: string,
		filePath: string
	) {
		const fullTitle = `${filePath}:${title}`;
		try {
			const response = await requestUrl({
				url: "https://api.notion.com/v1/pages",
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.plugin.settings.notionAPI}`,
					"Notion-Version": "2022-06-28",
				},
				body: JSON.stringify({
					parent: {
						database_id: this.plugin.settings.exportDatabaseID,
					},
					properties: {
						Name: { title: [{ text: { content: fullTitle } }] },
						Tags: {
							multi_select:
								allowTags && tags
									? tags.map((tag) => ({ name: tag }))
									: [],
						},
					},
					children: blocks,
				}),
			});

			const responseData = response.json;
			const pageId = responseData.id;
			const pageUrl = `https://www.notion.so/${pageId.replace(/-/g, "")}`;

			if (response.status === 200) {
				await this.updateYamlInfo(pageId, pageUrl, file, filePath);
				new Notice(`Sync to Notion success: ${file.basename}`);
			} else {
				new Notice(`Sync to Notion failed: ${file.basename}`);
			}
		} catch (error) {
			if (error.message.includes("Conflict")) {
				const existingFile =
					this.plugin.app.vault.getAbstractFileByPath(`${title}.md`);
				if (existingFile && existingFile instanceof TFile) {
					await this.plugin.app.vault.modify(existingFile, markdown);
					new Notice(`Updated file: ${title}.md`);
				} else {
					new Notice(`Error handling conflict for file: ${title}.md`);
				}
			} else {
				new Notice(`Error creating page: ${title}`);
				console.error(`Error creating page ${title}:`, error);
			}
		}
	}

	async updatePage(
		notionID: string,
		title: string,
		allowTags: boolean,
		tags: string[],
		blocks: any[],
		filePath: string
	) {
		// const fullTitle = `${filePath}:${title}`;
		const fullTitle = title;
		await requestUrl({
			url: `https://api.notion.com/v1/pages/${notionID}`,
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.plugin.settings.notionAPI}`,
				"Notion-Version": "2022-06-28",
			},
			body: JSON.stringify({
				properties: {
					Name: { title: [{ text: { content: fullTitle } }] },
					Tags: {
						multi_select:
							allowTags && tags
								? tags.map((tag) => ({ name: tag }))
								: [],
					},
				},
			}),
		});

		await this.clearChildrenBlocks(notionID);
		await this.appendChildrenBlocks(notionID, blocks);

		new Notice(`Sync to Notion success: ${title}`);
	}

	async clearChildrenBlocks(block_id: string) {
		const response = await requestUrl({
			url: `https://api.notion.com/v1/blocks/${block_id}/children`,
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.plugin.settings.notionAPI}`,
				"Notion-Version": "2022-06-28",
			},
		});

		const blocks = response.json.results;

		for (const block of blocks) {
			await requestUrl({
				url: `https://api.notion.com/v1/blocks/${block.id}`,
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${this.plugin.settings.notionAPI}`,
					"Notion-Version": "2022-06-28",
				},
			});
		}
	}

	async appendChildrenBlocks(block_id: string, blocks: any[]) {
		for (const block of blocks) {
			await requestUrl({
				url: `https://api.notion.com/v1/blocks/${block_id}/children`,
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.plugin.settings.notionAPI}`,
					"Notion-Version": "2022-06-28",
				},
				body: JSON.stringify({
					children: [block],
				}),
			});
		}
	}

	async updateYamlInfo(
		notionID: string,
		url: string,
		file: TFile,
		filePath: string
	) {
		const markdown = await this.plugin.app.vault.read(file);
		const frontmatter =
			this.plugin.app.metadataCache.getFileCache(file)?.frontmatter || {};
		frontmatter.notionID = notionID;
		frontmatter.link = url;
		frontmatter.filePath = filePath;
		const newContent = markdown.split("---")[2] || "";
		const yamlHead = stringifyYaml(frontmatter).trim();
		const content = `---\n${yamlHead}\n---\n${newContent}`;
		await this.plugin.app.vault.modify(file, content);
	}
}
