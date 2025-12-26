import type { Message, Reader } from "protobufjs";

// ============ Common Types ============

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  startPosition: Position;
  endPosition: Position;
}

export interface LineRange {
  startLineNumber: number;
  endLineNumberInclusive: number;
}

export interface Selection {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export type DataFrame = {};

export type Diagnostic = {};

export type TopChunk = {};

export type Cell = {};

export interface CurrentFileInfo {
  relativeWorkspacePath: string;
  contents: string;
  cursorPosition: CursorPosition;
  dataframes: DataFrame[];
  languageId: string;
  selection?: Selection;
  diagnostics: Diagnostic[];
  totalNumberOfLines: number;
  contentsStartAtLine: number;
  topChunks: TopChunk[];
  alternativeVersionId?: number;
  fileVersion?: number;
  cellStartLines: number[];
  cells: Cell[];
  sha256Hash?: string;
  relyOnFilesync: boolean;
  workspaceRootPath: string;
  lineEnding?: string;
}

export interface LinterError {
  message: string;
  range?: Selection;
  source?: string;
  relatedInformation: RelatedInformation[];
  severity?: Severity;
  isStale?: boolean;
}

export interface LinterErrors {
  relativeWorkspacePath: string;
  errors: LinterError[];
  fileContents: string;
}

export interface RelatedInformation {
  message: string;
  relativeWorkspacePath: string;
  relevantLines: string[];
  startLine: number;
}

export interface FileDiffHistory {
  fileName: string;
  diffHistory: string[];
  diffHistoryTimestamps: number[];
}

export interface AdditionalFile {
  relativeWorkspacePath: string;
  isOpen: boolean;
  visibleRangeContent: string[];
  lastViewedAt?: number;
  startLineNumberOneIndexed: number[];
  visibleRanges: LineRange[];
}

export interface WorkspaceUri {
  $mid: number;
  fsPath: string;
  external: string;
  path: string;
  scheme: string;
}

export interface RepositoryInfo {
  relativeWorkspacePath: string;
  remoteUrls?: string[];
  remoteNames?: string[];
  repoName: string;
  repoOwner: string;
  isTracked?: boolean;
  isLocal?: boolean;
  numFiles?: number;
  orthogonalTransformSeed?: number;
  preferredEmbeddingModel?: EmbeddingModel | string;
  workspaceUri?: string;
  workspaceUris?: Record<string, WorkspaceUri>;
  preferredDbProvider?: DbProvider;
}

export enum EmbeddingModel {
  UNSPECIFIED = 0,
}

export enum DbProvider {
  UNSPECIFIED = 0,
}

export enum Severity {
  UNSPECIFIED = 0,
}

export interface RefreshTabContextRequest {
  currentFile: CurrentFileInfo;
  modelName?: string;
  linterErrors?: LinterErrors;
  fileDiffHistories: FileDiffHistory[];
  additionalFiles: AdditionalFile[];
  clientTime?: number;
  timeSinceRequestStart: number;
  timeAtRequestSend: number;
  isDebug?: boolean;
  workspaceId?: string;
  supportsCpt?: boolean;
  supportsCrlfCpt?: boolean;
  repositoryInfo: RepositoryInfo;
}

export type SignatureRange = {};

export type DetailedLine = {};

export interface Signatures {
  ranges: SignatureRange[];
}

export interface CodeBlock {
  relativeWorkspacePath: string;
  range: Range;
  contents: string;
  signatures?: Signatures;
  detailedLines?: DetailedLine[];
}

export interface CodeResult {
  codeBlock: CodeBlock;
  score: number;
}

export interface RefreshTabContextResponse {
  codeResults: CodeResult[];
}

export type BlockDiffPatch = {};

export type ContextItem = {};

export type ParameterHint = {};

export type LspContext = {};

export type FilesyncUpdate = {};

export type LspSuggestion = {};

export interface LspSuggestedItems {
  suggestions: LspSuggestion[];
}

export interface CppIntentInfo {
  source: string;
}

export enum ControlToken {
  UNSPECIFIED = 0,
  QUIET = 1,
  LOUD = 2,
  OP = 3,
}

export interface StreamCppRequest {
  currentFile: CurrentFileInfo;
  diffHistory: string[];
  modelName?: string;
  linterErrors?: LinterErrors;
  diffHistoryKeys: string[];
  giveDebugOutput?: boolean;
  fileDiffHistories: FileDiffHistory[];
  mergedDiffHistories: FileDiffHistory[];
  blockDiffPatches: BlockDiffPatch[];
  isNightly?: boolean;
  isDebug?: boolean;
  immediatelyAck?: boolean;
  contextItems: ContextItem[];
  parameterHints: ParameterHint[];
  lspContexts: LspContext[];
  cppIntentInfo?: CppIntentInfo;
  enableMoreContext?: boolean;
  workspaceId?: string;
  additionalFiles: AdditionalFile[];
  controlToken?: ControlToken;
  clientTime?: number;
  filesyncUpdates: FilesyncUpdate[];
  timeSinceRequestStart: number;
  timeAtRequestSend: number;
  clientTimezoneOffset?: number;
  lspSuggestedItems?: LspSuggestedItems;
  supportsCpt?: boolean;
  supportsCrlfCpt?: boolean;
  codeResults: CodeResult[];
}

// ============ StreamCpp Response Types ============

export interface RangeToReplace {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CursorPredictionTarget {
  relativePath: string;
  lineNumberOneIndexed: number;
  expectedContent: string;
  shouldRetriggerCpp: boolean;
}

export interface ModelInfo {
  isFusedCursorPredictionModel: boolean;
  isMultidiffModel: boolean;
}

export interface StreamCppResponse {
  text?: string;
  suggestionStartLine?: number;
  suggestionConfidence?: number;
  doneStream?: boolean;
  debugModelOutput?: string;
  debugModelInput?: string;
  debugStreamTime?: string;
  debugTotalTime?: string;
  debugTtftTime?: string;
  debugServerTiming?: string;
  rangeToReplace?: RangeToReplace;
  cursorPredictionTarget?: CursorPredictionTarget;
  doneEdit?: boolean;
  modelInfo?: ModelInfo;
  beginEdit?: boolean;
  shouldRemoveLeadingEol?: boolean;
  bindingId?: string;
}

// ============ Protobufjs Types ============

export interface ProtoType {
  encode(message: Message | object): { finish(): Uint8Array };
  decode(buffer: Uint8Array | Buffer): Message;
  verify(message: object): string | null;
  create(properties: object): Message;
}

export interface ProtoReader extends Reader {
  pos: number;
  len: number;
  uint32(): number;
  int32(): number;
  double(): number;
  string(): string;
  skip(length: number): ProtoReader;
  skipType(wireType: number): ProtoReader;
}

// ============ HTTP Response Types ============

export interface StreamCppResult {
  status: number | undefined;
  contentType: string;
  modelInfo: ModelInfo | null;
  rangeToReplace: RangeToReplace | null;
  text: string;
  doneEdit: boolean;
  doneStream: boolean;
  debug: {
    modelOutput: string | undefined;
    modelInput: string | undefined;
    streamTime: string | undefined;
    ttftTime: string | undefined;
  } | null;
  trailer: unknown;
  error: unknown;
}

export interface DecodedCodeResult {
  codeBlock?: {
    relativeWorkspacePath?: string;
    range?: {
      startPosition?: { line?: number; column?: number };
      endPosition?: { line?: number; column?: number };
    };
    contents?: string;
    signatures?: { ranges: object[] };
    detailedLines?: object[];
  };
  score?: number;
}

export interface ManuallyDecodedResponse {
  codeResults?: DecodedCodeResult[];
}

export interface StreamUnifiedChatRequestWithTools {
  streamUnifiedChatRequest?: StreamUnifiedChatRequest;
  clientSideToolV2Result?: ClientSideToolV2Result;
}

export interface StreamUnifiedChatResponseWithTools {
  response: StreamUnifiedChatResponse;
  conversationSummary: ConversationSummary;
  userRules: UserRules;
  streamStart: StreamStart;
  tracingContext: TracingContext;
  eventId: string;
}

export interface ExplicitContext {
  context: string;
  rules: string[];
  mcpInstructions: string[];
}

export interface AzureState {
  apiKey: string;
  baseUrl: string;
  deployment: string;
  useAzure: boolean;
}

export interface ModelDetails {
  modelName: string;
  azureState: AzureState;
  maxMode: boolean;
}

export interface EnvironmentInfo {
  exthostPlatform: string;
  exthostArch: string;
  exthostRelease: string;
  exthostShell: string;
  localTimestamp: number;
  workspaceUris: string[];
  homeDirectory: string;
  localTimezone: string;
}

export interface ConversationHeader {
  bubbleId: string;
  type: string;
}

export interface WorkspaceFolder {
  uri: string;
  name: string;
}

export interface StreamUnifiedChatRequest {
  conversation: Conversation[];
  allowLongFileScan?: boolean;
  explicitContext?: ExplicitContext;
  canHandleFilenamesAfterLanguageIds?: boolean;
  modelDetails?: ModelDetails;
  documentationIdentifiers?: unknown[];
  externalLinks?: unknown[];
  diffsForCompressingFiles?: unknown[];
  multiFileLinterErrors?: unknown[];
  fileDiffHistories?: FileDiffHistory[];
  useNewCompressionScheme?: boolean;
  additionalRankedContext?: unknown[];
  quotes?: unknown[];
  isChat?: boolean;
  conversationId?: string;
  repositoryInfo?: RepositoryInfo;
  repositoryInfoShouldQueryStaging?: boolean;
  environmentInfo?: EnvironmentInfo;
  isAgentic?: boolean;
  supportedTools?: string[];
  fullConversationHeadersOnly?: ConversationHeader[];
  enableYoloMode?: boolean;
  yoloPrompt?: string;
  useUnifiedChatPrompt?: boolean;
  mcpTools?: unknown[];
  useFullInputsContext?: boolean;
  allowModelFallbacks?: boolean;
  numberOfTimesShownFallbackModelWarning?: number;
  repositoryInfoShouldQueryProd?: boolean;
  repoQueryAuthToken?: string;
  isHeadless?: boolean;
  unifiedMode?: string;
  toolsRequiringAcceptedReturn?: string[];
  shouldDisableTools?: boolean;
  thinkingLevel?: string;
  modeUsesAutoApply?: boolean;
  unifiedModeName?: string;
  editToolSupportsSearchAndReplace?: boolean;
  projectLayouts?: unknown[];
  supportsMermaidDiagrams?: boolean;
  supportsGitIndex?: boolean;
  isBackgroundComposer?: boolean;
  forceIsNotDev?: boolean;
  disableEditFileTimeout?: boolean;
  replyingToRequestId?: string;
  isQuickSearchQuery?: boolean;
  isSpecMode?: boolean;
  allowServerSideSemanticSearch?: boolean;
  speculativeSummarizationEncryptionKey?: string;
  workspaceFolders?: WorkspaceFolder[];
  doesReadfileSupportImages?: boolean;
  sandboxingSupportEnabled?: boolean;
  enableTerminalFilePersistence?: boolean;
  terminalsFolder?: string;
  hasMcpDescriptors?: boolean;
  agentTranscriptsFolder?: string;
}

export interface Conversation {
  text: string;
  type: number; // enum: 0=UNSPECIFIED, 1=HUMAN, 2=AI
  attachedCodeChunks?: unknown[];
  codebaseContextChunks?: unknown[];
  commits?: unknown[];
  pullRequests?: unknown[];
  gitDiffs?: unknown[];
  assistantSuggestedDiffs?: unknown[];
  interpreterResults?: unknown[];
  images?: unknown[];
  attachedFolders?: unknown[];
  approximateLintErrors?: unknown[];
  bubbleId?: string;
  attachedFoldersNew?: unknown[];
  lints?: unknown[];
  userResponsesToSuggestedCodeBlocks?: unknown[];
  relevantFiles?: unknown[];
  toolResults?: unknown[];
  notepads?: unknown[];
  capabilities?: unknown[];
  editTrailContexts?: unknown[];
  suggestedCodeBlocks?: unknown[];
  diffsForCompressingFiles?: unknown[];
  multiFileLinterErrors?: unknown[];
  diffHistories?: unknown[];
  recentlyViewedFiles?: unknown[];
  recentLocationsHistory?: unknown[];
  isAgentic?: boolean;
  fileDiffTrajectories?: unknown[];
  existedSubsequentTerminalCommand?: boolean;
  existedPreviousTerminalCommand?: boolean;
  docsReferences?: unknown[];
  webReferences?: unknown[];
  attachedFoldersListDirResults?: unknown[];
  humanChanges?: unknown[];
  attachedHumanChanges?: boolean;
  summarizedComposers?: unknown[];
  cursorRules?: unknown[];
  contextPieces?: unknown[];
  allThinkingBlocks?: unknown[];
  unifiedMode?: string;
  diffsSinceLastApply?: unknown[];
  deletedFiles?: unknown[];
  supportedTools?: string[];
  editToolSupportsSearchAndReplace?: boolean;
  consoleLogs?: unknown[];
  richText?: string;
  knowledgeItems?: unknown[];
  uiElementPicked?: unknown[];
  documentationSelections?: unknown[];
  externalLinks?: unknown[];
  useWeb?: boolean;
  projectLayouts?: unknown[];
  capabilityContexts?: unknown[];
  todos?: unknown[];
  requestId?: string;
  aiWebSearchResults?: unknown[];
  isPlanExecution?: boolean;
  createdAt?: string;
  modelInfo?: {
    modelName?: string;
  };
  isQuickSearchQuery?: boolean;
  mcpDescriptors?: unknown[];
  workspaceProjectDir?: string;
  workspaceUris?: string[];
}

// Tool enum type (placeholder - replace with actual enum if available)
export enum ClientSideTool {
  UNSPECIFIED = 0,
  // Add other tool types as needed
}

export interface ClientSideToolV2Result {
  // Field 1: tool (enum)
  tool: ClientSideTool;

  // Field 35: tool_call_id (scalar type 9 - uint64/int64)
  toolCallId: string | bigint;

  // Field 8: error (message, optional)
  error?: unknown;

  // Field 48: model_call_id (scalar type 9 - uint64/int64, optional)
  modelCallId?: string | bigint;

  // Field 49: tool_index (scalar type 13 - sint32, optional)
  toolIndex?: number;

  // Field 50: attachments (message, optional)
  attachments?: unknown;

  // Oneof "result" fields - only one should be set at a time
  // Field 2
  readSemsearchFilesResult?: unknown;
  // Field 4
  ripgrepSearchResult?: unknown;
  // Field 6
  readFileResult?: unknown;
  // Field 9
  listDirResult?: unknown;
  // Field 10
  editFileResult?: unknown;
  // Field 11
  fileSearchResult?: unknown;
  // Field 18
  semanticSearchFullResult?: unknown;
  // Field 20
  deleteFileResult?: unknown;
  // Field 21
  reapplyResult?: unknown;
  // Field 24
  runTerminalCommandV2Result?: unknown;
  // Field 25
  fetchRulesResult?: unknown;
  // Field 27
  webSearchResult?: unknown;
  // Field 28
  mcpResult?: unknown;
  // Field 32
  searchSymbolsResult?: unknown;
  // Field 33
  backgroundComposerFollowupResult?: unknown;
  // Field 34
  knowledgeBaseResult?: unknown;
  // Field 36
  fetchPullRequestResult?: unknown;
  // Field 37
  deepSearchResult?: unknown;
  // Field 38
  createDiagramResult?: unknown;
  // Field 39
  fixLintsResult?: unknown;
  // Field 40
  readLintsResult?: unknown;
  // Field 41
  gotodefResult?: unknown;
  // Field 42
  taskResult?: unknown;
  // Field 43
  awaitTaskResult?: unknown;
  // Field 44
  todoReadResult?: unknown;
  // Field 45
  todoWriteResult?: unknown;
  // Field 51
  editFileV2Result?: unknown;
  // Field 52
  listDirV2Result?: unknown;
  // Field 53
  readFileV2Result?: unknown;
  // Field 54
  ripgrepRawSearchResult?: unknown;
  // Field 55
  globFileSearchResult?: unknown;
  // Field 56
  createPlanResult?: unknown;
  // Field 57
  listMcpResourcesResult?: unknown;
  // Field 58
  readMcpResourceResult?: unknown;
  // Field 59
  readProjectResult?: unknown;
  // Field 60
  updateProjectResult?: unknown;
  // Field 61
  taskV2Result?: unknown;
  // Field 62
  callMcpToolResult?: unknown;
  // Field 63
  applyAgentDiffResult?: unknown;
  // Field 64
  askQuestionResult?: unknown;
  // Field 65
  switchModeResult?: unknown;
  // Field 66
  computerUseResult?: unknown;
  // Field 67
  generateImageResult?: unknown;
  // Field 68
  writeShellStdinResult?: unknown;
}

export interface StreamUnifiedChatResponse {
  text?: string;
  suggestionStartLine?: number;
  suggestionConfidence?: number;
  doneStream?: boolean;
  debugModelOutput?: string;
  debugModelInput?: string;
  debugStreamTime?: string;
  debugTotalTime?: string;
  debugTtftTime?: string;
  debugServerTiming?: string;
}

export interface ConversationSummary {
  summary: string;
}

export interface UserRules {
  rules: string;
}

export interface StreamStart {
  start: string;
}

export interface TracingContext {
  tracingId: string;
}
