import type { StreamingCommandPayload } from "./types";

export function createStreamingCommandPayload(
  code = "console.",
): StreamingCommandPayload {
  const now = Date.now();

  return {
    requestedModelId: 0,
    selectionStartLine: 0,
    selectionEndLine: 0,
    commandText: "",
    requestSource: 10,
    parentCompletionId: "",
    diffType: 4,
    diagnostics: [],
    supercompleteTriggerCondition: 3,
    ignoreSupercompleteDebounce: true,
    clipboardEntry: "",
    intellisenseSuggestions: [],
    document: {
      absolutePathMigrateMeToUri: "",
      absoluteUri: "untitled:Untitled-1",
      relativePathMigrateMeToWorkspaceUri: "",
      workspaceUri: "",
      text: code,
      editorLanguage: "javascript",
      language: 0,
      cursorOffset: code.length,
      lineEnding: "\n",
      isCutoffStart: false,
      isCutoffEnd: false,
      linesCutoffStart: 0,
      linesCutoffEnd: 0,
      isDirty: true,
      isSynthetic: false,
      timestamp: {
        seconds: Math.floor(now / 1_000),
        nanos: (now % 1_000) * 1_000_000,
      },
    },
    editorOptions: {
      tabSize: 4,
      insertSpaces: true,
      disableAutocompleteInComments: false,
    },
  };
}
