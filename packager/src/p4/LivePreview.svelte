<script>
  import {onDestroy} from 'svelte';
  import {_} from '../locales';
  import Packager from '../packager/web/export';
  import deepClone from './deep-clone';
  import Button from './Button.svelte';

  /** Current packager options. The preview rebuilds whenever they change. */
  export let options;
  /** The loaded project */
  export let project;

  // Rebuilding a very large project on every change would be slow, so auto update starts off for them.
  const LARGE_PROJECT_BYTES = 20 * 1000 * 1000;
  const AUTO_UPDATE_KEY = 'P4.livePreviewAutoUpdate';
  const UPDATE_DELAY = 600;

  const getInitialAutoUpdate = () => {
    try {
      const stored = localStorage.getItem(AUTO_UPDATE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (e) {
      // ignore
    }
    return !(project.arrayBuffer && project.arrayBuffer.byteLength > LARGE_PROJECT_BYTES);
  };

  let autoUpdate = getInitialAutoUpdate();
  $: {
    try {
      localStorage.setItem(AUTO_UPDATE_KEY, autoUpdate);
    } catch (e) {
      // ignore
    }
  }

  let url = null;
  let updating = false;
  let outdated = true;
  let errorMessage = '';
  let runningPackager = null;
  let generation = 0;
  let timeout = null;

  const getPreviewOptions = () => {
    const previewOptions = deepClone(options);
    // The preview always runs as a single HTML file, whatever the chosen output is.
    previewOptions.target = 'html';
    // Show touch controls on computers too so their layout can be checked here.
    if (previewOptions.touchControls.enabled) {
      previewOptions.touchControls.show = 'always';
    }
    return previewOptions;
  };

  const update = async () => {
    clearTimeout(timeout);
    if (runningPackager) {
      runningPackager.abort();
    }
    const thisGeneration = ++generation;
    updating = true;
    errorMessage = '';

    const packager = new Packager();
    packager.options = getPreviewOptions();
    packager.project = project;
    runningPackager = packager;

    try {
      const result = await packager.package();
      if (thisGeneration !== generation) return;
      const blob = new Blob([result.data], {
        type: result.type
      });
      if (url) {
        URL.revokeObjectURL(url);
      }
      url = URL.createObjectURL(blob);
      outdated = false;
    } catch (e) {
      if (thisGeneration !== generation) return;
      console.error(e);
      errorMessage = `${e}`;
    } finally {
      if (thisGeneration === generation) {
        updating = false;
        runningPackager = null;
      }
    }
  };

  const optionsChanged = () => {
    outdated = true;
    if (autoUpdate) {
      clearTimeout(timeout);
      timeout = setTimeout(update, UPDATE_DELAY);
    }
  };
  $: options, optionsChanged();

  $: aspectRatio = `${options.stageWidth} / ${options.stageHeight}`;

  onDestroy(() => {
    clearTimeout(timeout);
    if (runningPackager) {
      runningPackager.abort();
    }
    if (url) {
      URL.revokeObjectURL(url);
    }
  });
</script>

<style>
  .preview {
    position: relative;
    width: 100%;
    max-height: 70vh;
    background: #000000;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .message {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px;
    box-sizing: border-box;
    color: #ffffff;
  }
  .badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    background: rgba(0, 0, 0, 0.7);
    color: #ffffff;
    pointer-events: none;
  }
  .error {
    color: var(--danger);
    font-family: monospace;
    font-size: 12px;
    word-break: break-word;
  }
  .toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 10px;
  }
  .toolbar label {
    margin-right: auto;
  }
  .hint {
    color: var(--text-muted);
    font-size: 0.85em;
    margin: 8px 0 0;
  }
</style>

<div class="preview" style:aspect-ratio={aspectRatio}>
  {#if url}
    <iframe
      src={url}
      title={$_('pebble.previewTitle')}
      allow="fullscreen; autoplay; gamepad; microphone; camera; clipboard-read; clipboard-write"
    ></iframe>
  {:else if !updating && !autoUpdate}
    <div class="message">{$_('pebble.previewPaused')}</div>
  {/if}
  {#if updating}
    <div class="badge">{$_('pebble.previewUpdating')}</div>
  {:else if outdated && url}
    <div class="badge">{$_('pebble.previewOutdated')}</div>
  {/if}
</div>

{#if errorMessage}
  <p class="error">{errorMessage}</p>
{/if}

<div class="toolbar">
  <label>
    <input type="checkbox" bind:checked={autoUpdate} on:change={() => autoUpdate && outdated && update()}>
    {$_('pebble.previewAutoUpdate')}
  </label>
  <Button secondary on:click={update} disabled={updating} text={$_('pebble.previewRefresh')} />
  {#if url}
    <a href={url} target="_blank" rel="noopener">{$_('pebble.previewNewTab')}</a>
  {/if}
</div>

{#if options.touchControls.enabled}
  <p class="hint">{$_('pebble.previewTouchHint')}</p>
{/if}
