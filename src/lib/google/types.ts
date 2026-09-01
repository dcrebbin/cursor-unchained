export interface StreamingCommandOptions {
  code?: string;
  csrfToken?: string;
  endpoint?: string;
}

export interface StreamingCommandPayload {
  requestedModelId: number;
  selectionStartLine: number;
  selectionEndLine: number;
  commandText: string;
  requestSource: number;
  parentCompletionId: string;
  diffType: number;
  diagnostics: object[];
  supercompleteTriggerCondition: number;
  ignoreSupercompleteDebounce: boolean;
  clipboardEntry: string;
  intellisenseSuggestions: object[];
  document: {
    absolutePathMigrateMeToUri: string;
    absoluteUri: string;
    relativePathMigrateMeToWorkspaceUri: string;
    workspaceUri: string;
    text: string;
    editorLanguage: string;
    language: number;
    cursorOffset: number;
    lineEnding: string;
    isCutoffStart: boolean;
    isCutoffEnd: boolean;
    linesCutoffStart: number;
    linesCutoffEnd: number;
    isDirty: boolean;
    isSynthetic: boolean;
    timestamp: { seconds: number; nanos: number };
  };
  editorOptions: {
    tabSize: number;
    insertSpaces: boolean;
    disableAutocompleteInComments: boolean;
  };
}

export interface StreamingCommandResult {
  status: number | undefined;
  contentType: string;
  messages: unknown[];
  trailer: unknown;
  error: unknown;
}
