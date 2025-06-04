import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

/**
 * 수정 작업: 주어진 Markdown 문자열을 다음 규칙에 따라 변경합니다.
 * (YAML Frontmatter와 코드 블록은 이 함수 호출 전에 제외되어야 합니다)
 * 1. LaTeX 수식 표시:
 * - `\[\s*...\s*\]` → `$$...$$`
 * - `\(\s*...\s*\)` → `$...$`
 * (여닫이 기호 안쪽의 앞뒤 공백은 제거)
 * 2. 제목(title)과 리스트(list) 사이의 줄바꿈 조정:
 * - 제목(heading, `#`으로 시작)은 반드시 이전 줄과 이후 줄이 빈 줄로 구분되어야 함.
 * - 연속된 리스트 아이템 사이의 불필요한 빈 줄은 제거하여 하나의 리스트로 유지.
 *
 * @param content 원본 Markdown 텍스트 (YAML 및 코드 블록 제외)
 * @returns 수정된 Markdown 텍스트
 */
function modifyContentProtected(content: string): string {
	// 1) LaTeX 수식 기호 변환 (display math 먼저 처리)
	let newContent = content.replace(
		/\\\[\s*([\s\S]*?)\s*\\\]/g,
		(_match, inner) => {
			return `$$${inner.trim()}$$`;
		}
	);
	// inline math 처리
	newContent = newContent.replace(
		/\\\(\s*([\s\S]*?)\s*\\\)/g,
		(_match, inner) => {
			return `$${inner.trim()}$`;
		}
	);

	// 2) 제목 및 리스트 줄바꿈 조정
	const lines = newContent.split(/\r?\n/);
	const newLines: string[] = [];
	let lastMeaningfulType: "heading" | "list" | "other" | null = null;

	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i];
		const trimmedLine = rawLine.trim();

		const isBlank = trimmedLine === "";
		// 제목: 시작 공백 허용, # 뒤 공백 필수
		const isHeading = /^\s*#{1,6}\s+/.test(rawLine);
		// 리스트 아이템: 시작 공백 허용, 마커 뒤 공백 필수
		const isListItem = /^\s*([-*+]|\d+\.)\s+/.test(rawLine);

		if (isHeading) {
			// 제목 앞에 빈 줄 추가 (newLines의 마지막 줄이 비어있지 않다면)
			if (
				newLines.length > 0 &&
				newLines[newLines.length - 1].trim() !== ""
			) {
				newLines.push("");
			}
			newLines.push(rawLine.trimEnd());
			lastMeaningfulType = "heading";

			// 제목 뒤에 빈 줄 추가 로직:
			// 다음 줄이 존재하고, 그 다음 줄이 비어있지 않다면 빈 줄 추가.
			// 이렇게 하면 제목과 다음 내용(리스트, 다른 제목, 일반 텍스트) 사이에 항상 빈 줄이 하나 있게 됨.
			if (i + 1 < lines.length && lines[i + 1].trim() !== "") {
				// 이미 다음 줄이 빈 줄로 시작할 예정이 아니라면 (즉, 현재 제목 바로 뒤에 빈 줄이 없다면)
				// 하지만 newLines에 바로 빈 줄을 넣으면, 다음 루프에서 그 빈 줄이 isBlank로 처리될 때 중복될 수 있음.
				// 대신, 제목 바로 뒤에는 항상 빈 줄이 와야 한다는 "기대"를 설정하고,
				// 다음 요소가 처리될 때 이를 고려.
				// 현재 로직: 제목을 넣고 -> 다음 줄이 내용이면, newLines에 빈 줄 추가.
				// 이 방식은 제목-내용, 제목-EOF, 제목-빈줄-내용 케이스를 잘 처리함.
			}
			// 제목 처리 후, 다음 줄이 EOF가 아니고, 현재 newLines의 마지막에 빈 줄이 없다면 (즉, 방금 넣은 제목이 마지막),
			// 그리고 다음 줄이 바로 빈 줄이 아니라면, 여기에 빈 줄을 추가해준다.
			if (i + 1 < lines.length) {
				// 다음 줄이 존재한다면
				if (
					newLines.length > 0 &&
					newLines[newLines.length - 1].trim() !== "" &&
					lines[i + 1].trim() !== ""
				) {
					// 이 조건은 너무 복잡함. 원본 제공 로직을 최대한 따르자.
				}
			}
			// 원본 제공 로직: 제목을 넣고, 다음 줄이 실제로 내용(non-blank)이면, 그 사이에 빈 줄을 넣는다.
			if (i + 1 < lines.length && lines[i + 1].trim() !== "") {
				newLines.push("");
			}
			continue;
		}

		if (isListItem) {
			// 이전 유의미한 타입이 리스트였다면, 그 사이의 빈 줄들을 제거
			if (lastMeaningfulType === "list") {
				while (
					newLines.length > 0 &&
					newLines[newLines.length - 1].trim() === ""
				) {
					newLines.pop();
				}
			}
			// 만약 이전 타입이 제목이었고, 제목 로직에 의해 빈 줄이 newLines에 추가되었다면, 그 빈 줄은 유지된다.
			newLines.push(rawLine.trimEnd());
			lastMeaningfulType = "list";
			continue;
		}

		if (isBlank) {
			// 현재 줄이 빈 줄일 때:
			// newLines의 마지막 줄도 빈 줄이 아니라면, 이 빈 줄을 추가 (연속된 빈 줄 방지 효과)
			if (
				newLines.length === 0 ||
				newLines[newLines.length - 1].trim() !== ""
			) {
				newLines.push(""); // 표준화된 빈 줄
			}
			// lastMeaningfulType는 변경하지 않음 (빈 줄은 의미론적 타입을 바꾸지 않음)
			continue;
		}

		// 그 외 일반 텍스트
		// 만약 이전 타입이 리스트였고, 현재 일반 텍스트가 나온다면, 리스트와 일반 텍스트 사이에 빈 줄이 있는 것이 자연스러움.
		if (
			lastMeaningfulType === "list" &&
			newLines.length > 0 &&
			newLines[newLines.length - 1].trim() !== ""
		) {
			newLines.push(""); // 리스트와 일반 텍스트 사이에 빈 줄 추가
		}
		newLines.push(rawLine.trimEnd());
		lastMeaningfulType = "other";
	}

	// 최종적으로, 시작/끝의 빈 줄을 제거하고, 연속된 빈 줄은 하나로 압축.
	// (이 부분은 각 요소 처리 시 이미 어느 정도 반영되었으므로, 추가 정리가 필요할 수 있음)
	// 예를 들어, 맨 처음이나 맨 끝에 불필요한 빈 줄이 생겼다면 제거.
	let finalContent = newLines.join("\n");

	// 연속된 빈 줄(2개 이상의 \n)을 하나의 빈 줄(\n\n)로 만듦
	finalContent = finalContent.replace(/\n{3,}/g, "\n\n");

	// 문서 시작과 끝의 공백/개행 제거
	finalContent = finalContent.trim();

	return finalContent;
}

export default class MyLintPlugin extends Plugin {
	// settings: MyLintPluginSettings; // 설정이 없으므로 주석 처리

	async onload() {
		// await this.loadSettings(); // 설정이 없으므로 주석 처리

		this.addRibbonIcon("file-check-2", "myLint 적용", async () => {
			new Notice("myLint를 현재 파일에 적용합니다...");
			const activeFile = this.app.workspace.getActiveFile();

			if (activeFile && activeFile.extension === "md") {
				const originalFileContent = await this.app.vault.read(
					activeFile
				);
				let fileContentToProcess = originalFileContent;

				// 1. YAML Frontmatter 분리
				let frontmatter = "";
				const yamlRegex =
					/^---\s*[\r\n]([\s\S]*?)[\r\n]---\s*([\r\n]|$)/; // YAML 끝 --- 다음 개행이 없거나 EOF일 수도 있음
				const yamlMatch = fileContentToProcess.match(yamlRegex);

				if (yamlMatch) {
					frontmatter = yamlMatch[0];
					fileContentToProcess = fileContentToProcess.substring(
						frontmatter.length
					);
				}

				// 2. 코드 블록 분리 및 보호
				const codeBlockRegex = /```[\s\S]*?```/g;
				const placeholders: string[] = [];
				let tempContent = fileContentToProcess.replace(
					codeBlockRegex,
					(match) => {
						placeholders.push(match);
						return `%%%CODEBLOCK_PLACEHOLDER_${
							placeholders.length - 1
						}%%%`;
					}
				);

				// 3. 보호된 내용에 대해 lint 적용
				const modifiedContent = modifyContentProtected(tempContent);

				// 4. 코드 블록 복원
				let finalContent = modifiedContent;
				for (let i = 0; i < placeholders.length; i++) {
					finalContent = finalContent.replace(
						`%%%CODEBLOCK_PLACEHOLDER_${i}%%%`,
						placeholders[i]
					);
				}

				// 5. YAML Frontmatter와 최종 수정된 본문 결합
				const newFileContent = frontmatter + finalContent;

				if (originalFileContent !== newFileContent) {
					await this.app.vault.modify(activeFile, newFileContent);
					new Notice("myLint 적용 완료!");
				} else {
					new Notice("myLint: 변경 사항 없음.");
				}
			} else {
				new Notice(
					"활성화된 Markdown 파일이 없습니다. Markdown 파일을 열고 시도해주세요."
				);
			}
		});

		this.addSettingTab(new MyLintSettingTab(this.app, this));

		console.log("myLint plugin loaded.");
	}

	onunload() {
		console.log("myLint plugin unloaded.");
	}

	// 설정 로드/저장 함수 (현재 설정이 없으므로 기본 형태만 유지)
	// async loadSettings() {
	//     this.settings = Object.assign({}, {}, await this.loadData());
	// }

	// async saveSettings() {
	//     await this.saveData(this.settings);
	// }
}

class MyLintSettingTab extends PluginSettingTab {
	plugin: MyLintPlugin;

	constructor(app: App, plugin: MyLintPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "myLint 플러그인 정보" });
		containerEl.createEl("p", {
			text: "이 플러그인은 현재 활성화된 Markdown 파일에 다음의 lint 규칙을 적용합니다.",
		});

		const descList = containerEl.createEl("ul", {
			cls: "my-lint-rules-list",
		});

		descList.createEl("li", { text: "LaTeX 수식 표시 기호 변환:" });
		const latexUl = descList.createEl("ul");
		latexUl.createEl("li", {
			text: String.raw` 인라인 수식: \(\s*내용\s*\)  →  $내용$`,
		});
		latexUl.createEl("li", {
			text: String.raw` 디스플레이 수식: \[\s*내용\s*\]  →  $$내용$$`,
		});
		latexUl.createEl("li", {
			text: "(수식 내용의 앞뒤 불필요한 공백은 제거됩니다.)",
		});

		descList.createEl("li", { text: "Markdown 서식 및 줄바꿈 정리:" });
		const mdUl = descList.createEl("ul");
		mdUl.createEl("li", {
			text: "제목(Heading): 제목의 위와 아래에 각각 하나의 빈 줄이 있도록 조정됩니다 (다른 내용과 구분).",
		});
		mdUl.createEl("li", {
			text: "리스트(List Items): 연속된 리스트 아이템들 사이의 여러 빈 줄은 제거됩니다. 각 리스트 아이템은 단순 줄바꿈으로 구분됩니다.",
		});

		descList.createEl("li", { text: "보호되는 내용:" });
		const protectedUl = descList.createEl("ul");
		protectedUl.createEl("li", {
			text: "YAML Frontmatter: 파일 상단의 ---로 둘러싸인 부분은 변경되지 않습니다.",
		});
		protectedUl.createEl("li", {
			text: "코드 블록: ```로 둘러싸인 코드 블록 내부의 내용은 변경되지 않습니다.",
		});

		containerEl.createEl("p", {
			text: "사용 방법: Obsidian 편집기 좌측의 리본 메뉴에서 'myLint 적용' (체크 표시 아이콘)을 클릭하세요.",
			cls: "setting-item-description",
		});
	}
}
