<script lang="ts">
  import cursorUnchained from "$lib/assets/cursor-unchained.png";
  import { onMount, onDestroy } from "svelte";

  let testContent = $state("");
  import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
  let streamCppContent = $state("");
  let editor: Monaco.editor.IStandaloneCodeEditor | undefined =
    $state(undefined);
  let monaco: typeof Monaco;
  let editorContainer: HTMLDivElement | null = $state(null);
  let jsCode = $state("console.log('Hello from Monaco! (the editor");
  let jsTransparentCode = $state(
    "console.log('Hello from Monaco! (the editor');"
  );
  let transparentEditorContainer: HTMLDivElement | null = $state(null);
  let transparentEditor: Monaco.editor.IStandaloneCodeEditor | undefined =
    $state(undefined);
  let eventDisposables: any[] = [];
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    monaco = (await import("./monaco")).default;
    if (editorContainer) {
      editor = monaco.editor.create(editorContainer, {
        theme: "vs-dark",
        fontSize: 20,
      });
      if (transparentEditorContainer) {
        transparentEditor = monaco.editor.create(transparentEditorContainer, {
          theme: "vs-dark",
          fontSize: 20,
        });
      }
      const model = monaco.editor.createModel(jsCode, "javascript");
      const transparentModel = monaco.editor.createModel(
        jsTransparentCode,
        "javascript"
      );
      editor.setModel(model);
      if (transparentEditor) {
        transparentEditor.setModel(transparentModel);
      }

      function updateCodeCompletion() {
        const currentCode =
          editor?.getModel()?.getValue().replaceAll("\n", "\\n") ?? "";
        console.log("Current Code:", currentCode);
        fetch("/api/streamCpp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: currentCode,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            if (data.error) {
              console.error("API Error:", data.error);
              return;
            }
            const code = data.text;
            console.log("Stream Cpp:", code);

            if (transparentEditor && code) {
              transparentEditor
                .getModel()
                ?.setValue(code.replaceAll("\\n", "\n"));
            }
          })
          .catch((error) => {
            console.error("Fetch error:", error);
          });
      }

      const DEBOUNCE_DELAY = 500;

      function debouncedUpdateCodeCompletion() {
        if (debounceTimeout !== null) {
          clearTimeout(debounceTimeout);
        }
        debounceTimeout = setTimeout(() => {
          updateCodeCompletion();
          debounceTimeout = null;
        }, DEBOUNCE_DELAY);
      }

      const keyDownDisposable = editor.onKeyDown((e) => {
        console.log("Key pressed:", e.keyCode, e.browserEvent.key);

        debouncedUpdateCodeCompletion();
        if (e.browserEvent.key === "Tab" || e.keyCode === 2) {
          e.browserEvent.preventDefault();
          e.browserEvent.stopPropagation();
        }

        if (e.keyCode === 2) {
          const transparentCode =
            transparentEditor?.getModel()?.getValue() ?? "";
          editor?.getModel()?.setValue(transparentCode);
          if (editor) {
            const editorModel = editor.getModel();
            if (editorModel) {
              const lineCount = editorModel.getLineCount();
              const lastLineLength = editorModel.getLineLength(lineCount);
              editor.setPosition({
                lineNumber: lineCount,
                column: lastLineLength + 1,
              });
            }
          }
        }
      });
      const mouseDownDisposable = editor.onMouseDown((e) => {
        console.log("Mouse clicked:", e.target.position);
        debouncedUpdateCodeCompletion();
      });

      const mouseUpDisposable = editor.onMouseUp((e) => {
        console.log("Mouse released:", e.target.position);
      });

      eventDisposables = [
        keyDownDisposable,
        mouseDownDisposable,
        mouseUpDisposable,
      ];
    }
  });

  onDestroy(() => {
    if (debounceTimeout !== null) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    eventDisposables.forEach((disposable) => disposable.dispose());
    monaco?.editor.getModels().forEach((model: any) => model.dispose());
    editor?.dispose();
  });
</script>

<div
  class="flex flex-col items-center justify-start h-screen bg-black text-white py-4"
>
  <div class="container mx-auto p-4 flex flex-col items-center justify-center">
    <enhanced:img
      src={cursorUnchained}
      alt="Cursor Unchained"
      class="w-auto h-36"
    />

    <div id="test-content">
      {testContent}
    </div>
    <div id="streamCpp-content">
      {streamCppContent}
    </div>
    <div
      id="content"
      class="w-full max-w-[80rem] mt-4 flex justify-center items-center relative"
    >
      <div
        class="w-[80rem] h-[600px] absolute border-6 border-gray-700 rounded-md top-0 left-0 z-20"
        bind:this={editorContainer}
      ></div>
      <div
        class="w-[80rem] h-[600px] absolute border-6 border-gray-700 rounded-md top-0 left-0 z-10 opacity-50 z-[20] pointer-events-none"
        bind:this={transparentEditorContainer}
      ></div>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>
