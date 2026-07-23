require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const simpleGit = require("simple-git");

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion: "2022-06-28",
});

const n2m = new NotionToMarkdown({
    notionClient: notion,
});

function getPageTitle(page) {
    const titleProp = Object.values(page.properties).find(
        (p) => p.type === "title"
    );
    if (!titleProp || !titleProp.title || titleProp.title.length === 0) {
        return "Untitled";
    }
    return titleProp.title.map((t) => t.plain_text).join("");
}

function slugify(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function main() {
    try {
        const databaseId = process.env.NOTION_PAGE_ID;
        console.log("Querying Notion database:", databaseId);

        // Fetch all pages from the database
        const pages = [];
        let cursor;
        do {
            const body = cursor ? { start_cursor: cursor } : {};
            const response = await notion.request({
                path: "databases/" + databaseId + "/query",
                method: "POST",
                body,
            });
            pages.push(...response.results);
            cursor = response.has_more ? response.next_cursor : undefined;
        } while (cursor);

        console.log(`Found ${pages.length} pages in database.`);

        const outputDir = path.join(
            process.env.GITHUB_REPO,
            process.env.OUTPUT_DIR || "posts"
        );

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let hasChanges = false;

        // Convert each page to its own markdown file
        const entries = [];
        for (const page of pages) {
            const title = getPageTitle(page);
            const filename = slugify(title) + ".md";
            const filePath = path.join(outputDir, filename);

            console.log(`Converting: ${title} -> ${filename}`);
            const mdBlocks = await n2m.pageToMarkdown(page.id, 200);
            const md = n2m.toMarkdownString(mdBlocks);
            const content = `# ${title}\n\n${md.parent}`;

            entries.push({ title, filename });

            let oldContent = "";
            if (fs.existsSync(filePath)) {
                oldContent = fs.readFileSync(filePath, "utf8");
            }

            if (oldContent !== content) {
                fs.writeFileSync(filePath, content);
                hasChanges = true;
                console.log(`  Updated: ${filename}`);
            } else {
                console.log(`  No changes: ${filename}`);
            }
        }

        // Generate README with links to each post
        const outputDirName = process.env.OUTPUT_DIR || "posts";
        const readmeLines = [`# Mini Blogs\n`];
        for (const { title, filename } of entries) {
            readmeLines.push(`- [${title}](${outputDirName}/${filename})`);
        }
        const readmeContent = readmeLines.join("\n") + "\n";
        const readmePath = path.join(process.env.GITHUB_REPO, "README.md");

        let oldReadme = "";
        if (fs.existsSync(readmePath)) {
            oldReadme = fs.readFileSync(readmePath, "utf8");
        }
        if (oldReadme !== readmeContent) {
            fs.writeFileSync(readmePath, readmeContent);
            hasChanges = true;
            console.log("README.md updated.");
        }

        if (!hasChanges) {
            console.log("No changes detected.");
            return;
        }

        console.log("Files updated.");

        const git = simpleGit(process.env.GITHUB_REPO);

        await git.add(".");

        const status = await git.status();

        if (status.files.length === 0) {
            console.log("Nothing to commit.");
            return;
        }

        await git.commit(
            process.env.COMMIT_MESSAGE ||
                "docs: sync from Notion"
        );

        await git.push();

        console.log("GitHub updated successfully.");

    } catch (err) {
        console.error(err);
    }
}

main();