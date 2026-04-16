import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { StringEnum, Type } from "@mariozechner/pi-ai";
import {
	defineTool,
	type ExtensionAPI,
	getAgentDir,
	parseFrontmatter,
	withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";

type AgentScope = "user" | "project" | "both";

type AgentConfig = {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	systemPrompt: string;
	source: "user" | "project";
	filePath: string;
};

type UsageStats = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	contextTokens: number;
	turns: number;
};

type SingleResult = {
	agent: string | null;
	agentSource: "user" | "project" | "inline" | "unknown";
	task: string;
	exitCode: number;
	stderr: string;
	finalOutput: string;
	usage: UsageStats;
	model?: string;
	stopReason?: string;
	errorMessage?: string;
};

const AgentScopeSchema = StringEnum(["user", "project", "both"] as const);

const HeadlessSubagentParams = Type.Object({
	task: Type.String({ description: "Task to delegate to an isolated headless pi subprocess." }),
	agent: Type.Optional(Type.String({ description: "Optional named agent from ~/.pi/agent/agents or nearest .pi/agents." })),
	cwd: Type.Optional(Type.String({ description: "Optional working directory for the delegated run." })),
	model: Type.Optional(Type.String({ description: "Optional model override." })),
	tools: Type.Optional(Type.Array(Type.String(), { description: "Optional built-in tool allowlist override." })),
	systemPrompt: Type.Optional(Type.String({ description: "Optional inline system prompt override." })),
	agentScope: Type.Optional(AgentScopeSchema),
});

function emptyUsage(): UsageStats {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 };
}

function isDirectory(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isDirectory();
	} catch {
		return false;
	}
}

function findNearestProjectAgentsDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;
		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

function loadAgentsFromDir(dir: string, source: "user" | "project"): AgentConfig[] {
	if (!fs.existsSync(dir)) return [];
	let entries: fs.Dirent[] = [];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	const agents: AgentConfig[] = [];
	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;
		const filePath = path.join(dir, entry.name);
		let content = "";
		try {
			content = fs.readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}
		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);
		if (!frontmatter.name || !frontmatter.description) continue;
		const tools = frontmatter.tools
			?.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		agents.push({
			name: frontmatter.name,
			description: frontmatter.description,
			tools: tools && tools.length > 0 ? tools : undefined,
			model: frontmatter.model,
			systemPrompt: body,
			source,
			filePath,
		});
	}
	return agents;
}

function discoverAgents(cwd: string, scope: AgentScope): { agents: AgentConfig[]; projectAgentsDir: string | null } {
	const userDir = path.join(getAgentDir(), "agents");
	const projectAgentsDir = findNearestProjectAgentsDir(cwd);
	const userAgents = scope === "project" ? [] : loadAgentsFromDir(userDir, "user");
	const projectAgents = scope === "user" || !projectAgentsDir ? [] : loadAgentsFromDir(projectAgentsDir, "project");
	const merged = new Map<string, AgentConfig>();
	if (scope === "both") {
		for (const agent of userAgents) merged.set(agent.name, agent);
		for (const agent of projectAgents) merged.set(agent.name, agent);
	} else if (scope === "user") {
		for (const agent of userAgents) merged.set(agent.name, agent);
	} else {
		for (const agent of projectAgents) merged.set(agent.name, agent);
	}
	return { agents: Array.from(merged.values()), projectAgentsDir };
}

async function writePromptToTempFile(label: string, prompt: string): Promise<{ dir: string; filePath: string }> {
	const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-headless-subagent-"));
	const safeLabel = label.replace(/[^\w.-]+/g, "_");
	const filePath = path.join(tmpDir, `prompt-${safeLabel}.md`);
	await withFileMutationQueue(filePath, async () => {
		await fs.promises.writeFile(filePath, prompt, { encoding: "utf-8", mode: 0o600 });
	});
	return { dir: tmpDir, filePath };
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}
	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) return { command: process.execPath, args };
	return { command: "pi", args };
}

function extractFinalOutput(messages: any[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg?.role !== "assistant") continue;
		for (const part of msg.content ?? []) {
			if (part?.type === "text") return part.text ?? "";
		}
	}
	return "";
}

const headlessSubagentTool = defineTool({
	name: "headless_subagent",
	label: "Headless Subagent",
	description:
		"Delegate a development task to an isolated headless pi subprocess without tmux/cmux/zellij panes. Best for multi-step investigations or focused implementation work.",
	promptSnippet: "Delegate substantial work to an isolated headless pi subprocess when pane-based subagents are unavailable.",
	promptGuidelines: [
		"Prefer headless_subagent over pane-based subagent workflows in repositories that instruct you to use headless delegation.",
		"Use direct read/edit/bash for quick obvious tasks; use headless_subagent for isolated multi-step work.",
	],
	parameters: HeadlessSubagentParams,
	async execute(_toolCallId, params, signal, onUpdate, ctx) {
		const agentScope = (params.agentScope ?? "both") as AgentScope;
		const defaultCwd = params.cwd?.trim() || ctx.cwd;
		const discovery = discoverAgents(defaultCwd, agentScope);
		const agent = params.agent ? discovery.agents.find((candidate) => candidate.name === params.agent) : undefined;

		if (params.agent && !agent) {
			const available = discovery.agents.map((candidate) => candidate.name).join(", ") || "none";
			throw new Error(`Unknown agent: ${params.agent}. Available agents: ${available}`);
		}

		const model = params.model?.trim() || agent?.model;
		const tools = params.tools?.length ? params.tools : agent?.tools;
		const systemPrompt = params.systemPrompt?.trim() || agent?.systemPrompt || "";
		const args: string[] = ["--mode", "json", "-p", "--no-session"];
		if (model) args.push("--model", model);
		if (tools && tools.length > 0) args.push("--tools", tools.join(","));

		let tmpPromptDir: string | null = null;
		let tmpPromptPath: string | null = null;
		const messages: any[] = [];
		const result: SingleResult = {
			agent: agent?.name ?? null,
			agentSource: agent ? agent.source : systemPrompt ? "inline" : "unknown",
			task: params.task,
			exitCode: 0,
			stderr: "",
			finalOutput: "",
			usage: emptyUsage(),
			model,
		};

		const emitUpdate = (text?: string) => {
			onUpdate?.({
				content: [{ type: "text", text: text || result.finalOutput || "(running...)" }],
				details: {
					agent: result.agent,
					agentSource: result.agentSource,
					task: result.task,
					stderr: result.stderr,
					usage: result.usage,
					model: result.model,
					stopReason: result.stopReason,
					errorMessage: result.errorMessage,
				},
			});
		};

		try {
			if (systemPrompt) {
				const tmp = await writePromptToTempFile(agent?.name || "inline", systemPrompt);
				tmpPromptDir = tmp.dir;
				tmpPromptPath = tmp.filePath;
				args.push("--append-system-prompt", tmpPromptPath);
			}

			args.push(`Task: ${params.task}`);

			const invocation = getPiInvocation(args);
			const exitCode = await new Promise<number>((resolve, reject) => {
				const proc = spawn(invocation.command, invocation.args, {
					cwd: defaultCwd,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
				});
				let buffer = "";
				let wasAborted = false;

				const processLine = (line: string) => {
					if (!line.trim()) return;
					let event: any;
					try {
						event = JSON.parse(line);
					} catch {
						return;
					}

					if (event.type === "message_end" && event.message) {
						messages.push(event.message);
						if (event.message.role === "assistant") {
							result.usage.turns += 1;
							const usage = event.message.usage;
							if (usage) {
								result.usage.input += usage.input || 0;
								result.usage.output += usage.output || 0;
								result.usage.cacheRead += usage.cacheRead || 0;
								result.usage.cacheWrite += usage.cacheWrite || 0;
								result.usage.cost += usage.cost?.total || 0;
								result.usage.contextTokens = usage.totalTokens || 0;
							}
							if (!result.model && event.message.model) result.model = event.message.model;
							if (event.message.stopReason) result.stopReason = event.message.stopReason;
							if (event.message.errorMessage) result.errorMessage = event.message.errorMessage;
							result.finalOutput = extractFinalOutput(messages);
							emitUpdate();
						}
					}
				};

				proc.stdout.on("data", (data) => {
					buffer += data.toString();
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) processLine(line);
				});

				proc.stderr.on("data", (data) => {
					result.stderr += data.toString();
				});

				proc.on("close", (code) => {
					if (buffer.trim()) processLine(buffer);
					if (wasAborted) reject(new Error("Headless subagent was aborted"));
					else resolve(code ?? 0);
				});

				proc.on("error", (error) => {
					reject(error);
				});

				if (signal) {
					const killProc = () => {
						wasAborted = true;
						proc.kill("SIGTERM");
						setTimeout(() => {
							if (!proc.killed) proc.kill("SIGKILL");
						}, 5000);
					};
					if (signal.aborted) killProc();
					else signal.addEventListener("abort", killProc, { once: true });
				}
			});

			result.exitCode = exitCode;
			result.finalOutput = extractFinalOutput(messages);
			if (exitCode !== 0 && !result.errorMessage) {
				result.errorMessage = result.stderr.trim() || `headless_subagent exited with code ${exitCode}`;
			}

			return {
				content: [{ type: "text", text: result.finalOutput || result.errorMessage || "(no output)" }],
				details: {
					agent: result.agent,
					agentSource: result.agentSource,
					task: result.task,
					exitCode: result.exitCode,
					stderr: result.stderr,
					usage: result.usage,
					model: result.model,
					stopReason: result.stopReason,
					errorMessage: result.errorMessage,
					projectAgentsDir: discovery.projectAgentsDir,
				},
			};
		} finally {
			if (tmpPromptPath) {
				try {
					fs.unlinkSync(tmpPromptPath);
				} catch {}
			}
			if (tmpPromptDir) {
				try {
					fs.rmdirSync(tmpPromptDir);
				} catch {}
			}
		}
	},
});

export default function headlessSubagentExtension(pi: ExtensionAPI) {
	pi.registerTool(headlessSubagentTool);
}
