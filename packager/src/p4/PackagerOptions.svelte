<script>
  import {onDestroy} from 'svelte';
  // Standard JSON can't represent values such as Infinity, which some options use.
  import * as ExtendedJSON from '@turbowarp/json';
  import {_} from '../locales/';
  import {slide, fade} from 'svelte/transition';
  import Section from './Section.svelte';
  import Button from '../p4/Button.svelte';
  import ImageInput from './ImageInput.svelte';
  import LearnMore from './LearnMore.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import Downloads from './Downloads.svelte';
  import LivePreview from './LivePreview.svelte';
  import Progress from './Progress.svelte';
  import writablePersistentStore from './persistent-store';
  import fileStore from './file-store';
  import {progress, currentTask, error} from './stores';
  import deepClone from './deep-clone';
  import Packager from '../packager/web/export';
  import Task from './task';
  import downloadURL from './download-url';
  import {recursivelySerializeBlobs, recursivelyDeserializeBlobs} from './blob-serializer';
  import {readAsText} from '../common/readers';
  import {
    getDefaultButtonLabel,
    ARROW_KEYS,
    WASD_KEYS,
    BUTTON_KEY_CHOICES
  } from '../common/touch-control-keys';
  import merge from './merge';
  import DropArea from './DropArea.svelte';
  import {APP_NAME} from '../packager/brand';

  export let projectData;
  export let title;

  const keysUsed = projectData.project.analysis.keysUsed || [];
  const MAX_TOUCH_BUTTONS = 4;

  const defaultOptions = Packager.DEFAULT_OPTIONS();
  defaultOptions.projectId = projectData.projectId || `p4-${projectData.uniqueId}`;
  defaultOptions.app.packageName = Packager.getDefaultPackageNameFromFileName(projectData.title);
  defaultOptions.app.windowTitle = Packager.getWindowTitleFromFileName(projectData.title);

  // Set up touch controls for the keys the project actually uses.
  if (keysUsed.length > 0) {
    const usesArrows = keysUsed.some((key) => ARROW_KEYS.includes(key));
    const usesWasd = WASD_KEYS.filter((key) => keysUsed.includes(key)).length >= 3;
    const dpad = usesArrows ? 'arrows' : usesWasd ? 'wasd' : 'none';
    // Games often support both arrow keys and WASD, so the d-pad covers both.
    const keysOnDpad = [
      ...(usesArrows ? ARROW_KEYS : []),
      ...(usesWasd ? WASD_KEYS : [])
    ];
    defaultOptions.touchControls.enabled = true;
    defaultOptions.touchControls.dpad = dpad;
    defaultOptions.touchControls.buttons = keysUsed
      .filter((key) => !keysOnDpad.includes(key))
      .slice(0, MAX_TOUCH_BUTTONS)
      .map((key) => ({
        key,
        label: ''
      }));
  }

  const options = writablePersistentStore(`PackagerOptions.${projectData.uniqueId}`, defaultOptions);

  // Infinite clones used to be stored as a big number instead of actual `Infinity`.
  const ALMOST_INFINITY = 9999999999;
  if ($options.maxClones === ALMOST_INFINITY) {
    $options.maxClones = Infinity;
  }

  const hasMagicComment = (magic) => projectData.project.analysis.stageComments.find(
    (text) => text.split('\n').find((line) => line.endsWith(magic))
  );
  const hasSettingsStoredInProject = hasMagicComment(' // _twconfig_');

  let result = null;
  const resetResult = () => {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
    result = null;
  }
  $: $options, resetResult(), currentTask.abort();

  const icon = fileStore.writableFileStore(`PackagerOptions.icon.${projectData.uniqueId}`);
  $: $options.app.icon = $icon;

  const customCursorIcon = fileStore.writableFileStore(`PackagerOptions.customCursorIcon.${projectData.uniqueId}`);
  $: $options.cursor.custom = $customCursorIcon;

  const loadingScreenImage = fileStore.writableFileStore(`PackagerOptions.loadingScreenImage.${projectData.uniqueId}`);
  $: $options.loadingScreen.image = $loadingScreenImage;

  $: title = $options.app.windowTitle;

  const setOptions = (newOptions) => {
    $options = newOptions;
    $icon = $options.app.icon;
    $customCursorIcon = $options.cursor.custom;
    $loadingScreenImage = $options.loadingScreen.image;
  };

  const MAIN_TARGETS = [
    'html',
    'pwa',
    'zip',
    'electron-win32',
    'webview-mac',
    'electron-linux64'
  ];
  const otherEnvironmentsInitiallyOpen = !MAIN_TARGETS.includes($options.target);

  $: isApplication = !['html', 'pwa', 'zip', 'zip-one-asset'].includes($options.target);

  const advancedOptionsInitiallyOpen = (
    $options.compiler.enabled !== defaultOptions.compiler.enabled ||
    $options.compiler.warpTimer !== defaultOptions.compiler.warpTimer ||
    $options.bakeExtensions !== defaultOptions.bakeExtensions ||
    $options.custom.css !== '' ||
    $options.custom.js !== '' ||
    $options.projectId !== defaultOptions.projectId ||
    $options.packagedRuntime !== defaultOptions.packagedRuntime ||
    $options.maxTextureDimension !== defaultOptions.maxTextureDimension
  );

  const buttonKeyChoices = [
    ...BUTTON_KEY_CHOICES,
    ...keysUsed.filter((key) => !BUTTON_KEY_CHOICES.includes(key))
  ];

  const addTouchButton = () => {
    const unusedKey = keysUsed.find((key) => !$options.touchControls.buttons.some((button) => button.key === key));
    $options.touchControls.buttons = [
      ...$options.touchControls.buttons,
      {
        key: unusedKey || 'space',
        label: ''
      }
    ];
  };

  const removeTouchButton = (index) => {
    $options.touchControls.buttons = $options.touchControls.buttons.filter((_button, i) => i !== index);
  };

  const automaticallyCenterCursor = () => {
    const icon = $customCursorIcon;
    const url = URL.createObjectURL(icon)
    const image = new Image();
    const cleanup = () => {
      image.onerror = null;
      image.onload = null;
      URL.revokeObjectURL(url);
    };
    image.onload = () => {
      $options.cursor.center.x = Math.round(image.width / 2);
      $options.cursor.center.y = Math.round(image.height / 2);
      cleanup();
    };
    image.onerror = () => {
      cleanup();
      $error = new Error('Image could not be loaded');
      throw $error;
    };
    image.src = url;
  };

  const runPackager = async (task, options) => {
    const packager = new Packager();
    packager.options = options;
    packager.project = projectData.project;

    task.addEventListener('abort', () => {
      packager.abort();
    });

    task.setProgressText($_('progress.loadingScripts'));

    packager.addEventListener('fetch-extensions', ({detail}) => {
      task.setProgressText($_('progress.downloadingExtensions'));
      task.setProgress(detail.progress);
    });
    packager.addEventListener('large-asset-fetch', ({detail}) => {
      let thing;
      if (detail.asset.startsWith('nwjs-')) {
        thing = 'NW.js';
      } else if (detail.asset.startsWith('electron-')) {
        thing = 'Electron';
      } else if (detail.asset === 'webview-mac') {
        thing = 'WKWebView';
      } else if (detail.asset === 'steamworks.js') {
        thing = 'Steamworks.js';
      }
      if (thing) {
        task.setProgressText($_('progress.loadingLargeAsset').replace('{thing}', thing));
      }
      task.setProgress(detail.progress);
    });
    packager.addEventListener('zip-progress', ({detail}) => {
      task.setProgressText($_('progress.compressingProject'));
      task.setProgress(detail.progress);
    });

    const result = await packager.package();
    result.blob = new Blob([result.data], {
      type: result.type
    });
    result.url = URL.createObjectURL(result.blob);
    return result;
  };

  const pack = async () => {
    resetResult();
    const task = new Task();
    result = await task.do(runPackager(task, deepClone($options)));
    task.done();
    downloadURL(result.filename, result.url);
  };

  const resetOptions = (properties) => {
    for (const key of properties) {
      let current = $options;
      let defaults = defaultOptions;
      const parts = key.split('.');
      const lastPart = parts.pop();
      for (const i of parts) {
        current = current[i];
        defaults = defaults[i];
      }
      current[lastPart] = deepClone(defaults[lastPart]);
    }
    $options = $options;
  };

  const resetAll = () => {
    if (confirm($_('reset.confirmAll'))) {
      resetOptions(Object.keys($options));
      $icon = null;
      $customCursorIcon = null;
      $loadingScreenImage = null;
    }
  };

  const exportOptions = async () => {
    const exported = await recursivelySerializeBlobs($options);
    const blob = new Blob([ExtendedJSON.stringify(exported)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const formattedAppName = APP_NAME
      .replace(/[^a-z0-9 ]/gi, '')
      .replace(/ /g, '-')
      .toLowerCase();
    downloadURL(`${formattedAppName}-settings.json`, url);
    URL.revokeObjectURL(url);
  };

  const importOptions = async () => {
    const input = document.createElement("input");
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      importOptionsFromDataTransfer(e.target);
    });
    document.body.appendChild(input);
    input.click();
    input.remove();
  };

  const importOptionsFromDataTransfer = async (dataTransfer) => {
    const file = dataTransfer.files[0];
    if (!file) {
      // Should never happen.
      return;
    }
    try {
      const text = await readAsText(file);
      const parsed = ExtendedJSON.parse(text);
      const deserialized = recursivelyDeserializeBlobs(parsed);
      const copiedDefaultOptions = deepClone(defaultOptions);
      const mergedWithDefaults = merge(deserialized, copiedDefaultOptions);
      if (mergedWithDefaults.maxClones === ALMOST_INFINITY) {
        mergedWithDefaults.maxClones = Infinity;
      }

      const isUnsafe = Packager.usesUnsafeOptions(mergedWithDefaults);
      if (!isUnsafe || confirm($_('options.confirmImportUnsafe'))) {
        setOptions(mergedWithDefaults);
      }
    } catch (e) {
      $error = e;
    }
  };

  onDestroy(() => {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
  });
</script>

<style>
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 640px) minmax(0, 560px);
    gap: 0 24px;
    justify-content: center;
    align-items: start;
  }
  .workspace :global(.card) {
    max-width: none;
  }
  .side {
    position: sticky;
    top: 0;
    padding-top: 1px;
  }
  @media (max-width: 1000px) {
    .workspace {
      grid-template-columns: minmax(0, 640px);
    }
    .side {
      position: static;
      order: -1;
    }
  }
  .option {
    display: block;
    margin: 6px 0;
  }
  .group {
    margin: 12px 0;
  }
  p {
    margin: 8px 0;
  }
  .group:last-child, .option:last-child, p:last-child {
    margin-bottom: 0;
  }
  .help {
    color: var(--text-muted);
    font-size: 0.9em;
  }
  .target {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 10px;
    margin: 4px 0;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .target:hover {
    background: var(--hover);
  }
  .target.selected {
    border-color: var(--input-border);
    background: var(--hover);
  }
  .target input {
    margin-top: 3px;
  }
  .target-name {
    font-weight: bold;
  }
  .target-description {
    display: block;
    color: var(--text-muted);
    font-size: 0.9em;
  }
  .target-details {
    margin: 12px 0 0;
    padding: 12px;
    border-radius: 6px;
    background: var(--hover);
  }
  .touch-button-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
  }
  .touch-button-row input[type="text"] {
    width: 90px;
  }
  .keys {
    font-family: monospace;
  }
  .advanced {
    max-width: none;
  }
  .advanced > summary {
    list-style: none;
    border-radius: 8px;
    background-color: var(--card);
    border: 1px solid var(--border);
    padding: 1em 1.25em;
    margin: 1em 0;
  }
  .advanced > summary::-webkit-details-marker {
    display: none;
  }
  .advanced > summary h2 {
    display: inline;
    margin: 0;
  }
  .advanced > summary::after {
    content: "\25bc";
    float: right;
    color: var(--text-muted);
  }
  .advanced[open] > summary::after {
    content: "\25b2";
  }
  .advanced > summary .help {
    display: block;
    margin-top: 4px;
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 100%;
    height: 150px;
  }
  input[type="text"] {
    width: 200px;
  }
  input[type="text"].shorter {
    width: 150px;
  }
  input[type="number"] {
    width: 60px;
  }
  input:invalid, .version:placeholder-shown {
    outline: 2px solid red;
  }
  .warning {
    font-weight: bold;
    background: #ffd966;
    color: black;
    padding: 10px;
    border-radius: 6px;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .side-buttons {
    margin-left: auto;
  }
  .package-progress {
    margin-top: 12px;
  }
</style>

<div class="workspace">
<div class="settings">

<Section
  reset={() => {
    $icon = null;
    resetOptions([
      'app.windowTitle',
      'target',
      'pwa'
    ]);
  }}
>
  <div>
    <h2>{$_('pebble.basics')}</h2>

    <label class="option">
      {$_('pebble.name')}
      <input type="text" bind:value={$options.app.windowTitle}>
    </label>
    <div class="option">
      {$_('options.icon')}
      <ImageInput bind:file={$icon} previewSizes={[[64, 64], [32, 32], [16, 16]]} />
    </div>

    <h3>{$_('pebble.output')}</h3>
    <div class="group">
      <label class="target" class:selected={$options.target === 'html'}>
        <input type="radio" name="environment" bind:group={$options.target} value="html">
        <span>
          <span class="target-name">{$_('pebble.outputHtml')}</span>
          <span class="target-description">{$_('pebble.outputHtmlHelp')}</span>
        </span>
      </label>
      <label class="target" class:selected={$options.target === 'pwa'}>
        <input type="radio" name="environment" bind:group={$options.target} value="pwa">
        <span>
          <span class="target-name">{$_('pebble.outputPwa')}</span>
          <span class="target-description">{$_('pebble.outputPwaHelp')}</span>
        </span>
      </label>
      <label class="target" class:selected={$options.target === 'zip'}>
        <input type="radio" name="environment" bind:group={$options.target} value="zip">
        <span>
          <span class="target-name">{$_('pebble.outputZip')}</span>
          <span class="target-description">{$_('pebble.outputZipHelp')}</span>
        </span>
      </label>
      <label class="target" class:selected={$options.target === 'electron-win32'}>
        <input type="radio" name="environment" bind:group={$options.target} value="electron-win32">
        <span>
          <span class="target-name">{$_('pebble.outputWindows')}</span>
          <span class="target-description">{$_('pebble.outputAppHelp')}</span>
        </span>
      </label>
      <label class="target" class:selected={$options.target === 'webview-mac'}>
        <input type="radio" name="environment" bind:group={$options.target} value="webview-mac">
        <span>
          <span class="target-name">{$_('pebble.outputMac')}</span>
          <span class="target-description">{$_('pebble.outputAppHelp')}</span>
        </span>
      </label>
      <label class="target" class:selected={$options.target === 'electron-linux64'}>
        <input type="radio" name="environment" bind:group={$options.target} value="electron-linux64">
        <span>
          <span class="target-name">{$_('pebble.outputLinux')}</span>
          <span class="target-description">{$_('pebble.outputAppHelp')}</span>
        </span>
      </label>
    </div>

    <details open={otherEnvironmentsInitiallyOpen}>
      <summary>{$_('pebble.moreOutputs')}</summary>
      <p class="help">{$_('options.otherEnvironmentsHelp')}</p>
      <div class="group">
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="zip-one-asset">
          {$_('options.zip-one-asset')}
        </label>
      </div>
      <div class="group">
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="electron-win64">
          {$_('options.application-win64').replace('{type}', 'Electron')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="electron-win-arm">
          {$_('options.application-win-arm').replace('{type}', 'Electron')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="electron-mac">
          {$_('options.application-mac').replace('{type}', 'Electron')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="electron-linux-arm32">
          {$_('options.application-linux-arm32').replace('{type}', 'Electron')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="electron-linux-arm64">
          {$_('options.application-linux-arm64').replace('{type}', 'Electron')}
        </label>
      </div>
      <div class="group">
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="nwjs-win32">
          {$_('options.application-win32').replace('{type}', 'NW.js')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="nwjs-win64">
          {$_('options.application-win64').replace('{type}', 'NW.js')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="nwjs-mac">
          {$_('options.application-mac').replace('{type}', 'NW.js')}
        </label>
        <label class="option">
          <input type="radio" name="environment" bind:group={$options.target} value="nwjs-linux-x64">
          {$_('options.application-linux64').replace('{type}', 'NW.js')}
        </label>
      </div>
    </details>

    {#if $options.target === 'pwa'}
      <div class="target-details" in:fade|local>
        <p>{$_('pebble.pwaHelp')}</p>
        <label class="option">
          {$_('pebble.pwaDisplay')}
          <select bind:value={$options.pwa.display}>
            <option value="fullscreen">{$_('pebble.pwaFullscreen')}</option>
            <option value="standalone">{$_('pebble.pwaStandalone')}</option>
          </select>
        </label>
        <label class="option">
          {$_('pebble.pwaOrientation')}
          <select bind:value={$options.pwa.orientation}>
            <option value="any">{$_('pebble.orientationAny')}</option>
            <option value="landscape">{$_('pebble.orientationLandscape')}</option>
            <option value="portrait">{$_('pebble.orientationPortrait')}</option>
          </select>
        </label>
      </div>
    {:else if $options.target.startsWith('zip')}
      <div class="target-details" in:fade|local>
        <p>{$_('pebble.zipHelp')}</p>
      </div>
    {:else if isApplication}
      <div class="target-details" in:fade|local>
        <label class="option">
          {$_('options.packageName')}
          <input type="text" bind:value={$options.app.packageName} pattern="[\w \-]+" minlength="1">
        </label>
        <p class="help">{$_('options.packageNameHelp')}</p>

        <label class="option">
          {$_('options.version')}
          <input type="text" class="version" bind:value={$options.app.version} pattern="\d+\.\d+\.\d+" placeholder="1.0.0" minlength="1">
        </label>
        <p class="help">{$_('options.versionHelp')}</p>

        {#if $options.target.includes('electron')}
          <label class="option">
            {$_('options.initalWindowSize')}
            <select bind:value={$options.app.windowMode}>
              <option value="window">{$_('options.startWindow')}</option>
              <option value="maximize">{$_('options.startMaximized')}</option>
              <option value="fullscreen">{$_('options.startFullscreen')}</option>
            </select>
          </label>

          <label class="option">
            {$_('options.escapeBehavior')}
            <select bind:value={$options.app.escapeBehavior}>
              <option value="unfullscreen-only">{$_('options.unFullscreenOnly')}</option>
              <option value="exit-only">{$_('options.exitOnly')}</option>
              <option value="unfullscreen-or-exit">{$_('options.unFullscreenOrExit')}</option>
              <option value="nothing">{$_('options.doNothing')}</option>
            </select>
          </label>

          <label class="option">
            {$_('options.windowControls')}
            <select bind:value={$options.app.windowControls}>
              <option value="default">{$_('options.defaultControls')}</option>
              <option value="frameless">{$_('options.noControls')}</option>
            </select>
          </label>

          <label class="option">
            <input type="checkbox" bind:checked={$options.app.backgroundThrottling}>
            {$_('options.backgroundThrottling')}
          </label>
        {/if}

        <p class="help">{$_('pebble.appSizeHelp')}</p>
        {#if $options.target.includes('win')}
          <p class="help">{$_('pebble.windowsHelp')}</p>
        {:else if $options.target.includes('mac')}
          <p class="help">{$_('pebble.macHelp')}</p>
        {:else if $options.target.includes('linux')}
          <p class="help">{$_('pebble.linuxHelp')}</p>
        {/if}
      </div>
    {/if}
  </div>
</Section>

<Section
  reset={() => {
    resetOptions([
      'touchControls'
    ]);
  }}
>
  <div>
    <h2>{$_('pebble.touchControls')}</h2>
    <p class="help">{$_('pebble.touchControlsHelp')}</p>
    {#if keysUsed.length > 0}
      <p class="help">
        {$_('pebble.touchControlsDetected')}
        <span class="keys">{keysUsed.join(', ')}</span>
      </p>
    {:else}
      <p class="help">{$_('pebble.touchControlsNoKeys')}</p>
    {/if}

    <label class="option">
      <input type="checkbox" bind:checked={$options.touchControls.enabled}>
      {$_('pebble.touchControlsEnable')}
    </label>

    {#if $options.touchControls.enabled}
      <div in:slide|local>
        <label class="option">
          {$_('pebble.touchShow')}
          <select bind:value={$options.touchControls.show}>
            <option value="touch">{$_('pebble.touchShowTouch')}</option>
            <option value="always">{$_('pebble.touchShowAlways')}</option>
          </select>
        </label>
        <label class="option">
          {$_('pebble.touchDpad')}
          <select bind:value={$options.touchControls.dpad}>
            <option value="arrows">{$_('pebble.touchDpadArrows')}</option>
            <option value="wasd">{$_('pebble.touchDpadWasd')}</option>
            <option value="none">{$_('pebble.touchDpadNone')}</option>
          </select>
        </label>
        <label class="option">
          {$_('pebble.touchSize')}
          <select bind:value={$options.touchControls.size}>
            <option value="small">{$_('pebble.sizeSmall')}</option>
            <option value="medium">{$_('pebble.sizeMedium')}</option>
            <option value="large">{$_('pebble.sizeLarge')}</option>
          </select>
        </label>

        <h3>{$_('pebble.touchButtons')}</h3>
        {#each $options.touchControls.buttons as button, index}
          <div class="touch-button-row">
            <select bind:value={button.key} aria-label={$_('pebble.touchButtonKey')}>
              {#each buttonKeyChoices as key}
                <option value={key}>{key}</option>
              {/each}
            </select>
            <input
              type="text"
              bind:value={button.label}
              placeholder={getDefaultButtonLabel(button.key)}
              maxlength="6"
              aria-label={$_('pebble.touchButtonLabel')}
            >
            <Button secondary on:click={() => removeTouchButton(index)} text={$_('pebble.touchRemoveButton')} />
          </div>
        {/each}
        {#if $options.touchControls.buttons.length < MAX_TOUCH_BUTTONS}
          <Button secondary on:click={addTouchButton} text={$_('pebble.touchAddButton')} />
        {/if}
      </div>
    {/if}
  </div>
</Section>

<Section
  reset={() => {
    $loadingScreenImage = null;
    resetOptions([
      'loadingScreen',
      'autoplay',
      'controls',
      'appearance'
    ]);
  }}
>
  <div>
    <h2>{$_('pebble.appearance')}</h2>

    <h3>{$_('options.controls')}</h3>
    <div class="group">
      <label class="option">
        <input type="checkbox" bind:checked={$options.autoplay}>
        {$_('options.autoplay')}
      </label>
      {#if $options.autoplay}
        <p class="help">{$_('options.autoplayHint')}</p>
      {/if}
    </div>
    <label class="option">
      <input type="checkbox" bind:checked={$options.controls.greenFlag.enabled}>
      {$_('options.showFlag')}
    </label>
    <label class="option">
      <input type="checkbox" bind:checked={$options.controls.stopAll.enabled}>
      {$_('options.showStop')}
    </label>
    <label class="option">
      <input type="checkbox" bind:checked={$options.controls.pause.enabled}>
      {$_('options.showPause')}
    </label>
    <label class="option">
      <input type="checkbox" bind:checked={$options.controls.fullscreen.enabled}>
      {$_('options.showFullscreen')}
    </label>

    <h3>{$_('options.loadingScreen')}</h3>
    <label class="option">
      <input type="checkbox" bind:checked={$options.loadingScreen.progressBar}>
      {$_('options.showProgressBar')}
    </label>
    <label class="option">
      {$_('options.loadingScreenText')}
      <input type="text" bind:value={$options.loadingScreen.text} placeholder={$_('options.loadingScreenTextPlaceholder')}>
    </label>
    <div class="option">
      {$_('options.loadingScreenImage')}
      <!-- Display preview at image's native size -->
      <ImageInput bind:file={$loadingScreenImage} previewSizes={[['', '']]} />
    </div>
    {#if $loadingScreenImage}
      <label class="option">
        <input type="radio" name="loading-screen-mode" value="normal" bind:group={$options.loadingScreen.imageMode}>
        {$_('options.sizeNormal')}
      </label>
      <label class="option">
        <input type="radio" name="loading-screen-mode" value="stretch" bind:group={$options.loadingScreen.imageMode}>
        {$_('options.sizeStretch')}
      </label>
    {/if}

    <h3>{$_('options.colors')}</h3>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="option">
      <ColorPicker bind:value={$options.appearance.background} />
      {$_('options.backgroundColor')}
    </label>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="option">
      <ColorPicker bind:value={$options.appearance.foreground} />
      {$_('options.foregroundColor')}
    </label>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="option">
      <ColorPicker bind:value={$options.appearance.accent} />
      {$_('options.accentColor')}
    </label>
  </div>
</Section>

<details class="advanced" open={advancedOptionsInitiallyOpen}>
  <summary>
    <h2>{$_('pebble.advanced')}</h2>
    <span class="help">{$_('pebble.advancedHelp')}</span>
  </summary>

  <Section
    reset={() => {
      resetOptions([
        'turbo',
        'framerate',
        'interpolation',
        'highQualityPen',
        'maxClones',
        'fencing',
        'miscLimits',
        'stageWidth',
        'stageHeight',
        'resizeMode',
        'username',
        'closeWhenStopped'
      ]);
    }}
  >
    <div>
      <h2>{$_('options.runtimeOptions')}</h2>

      {#if hasSettingsStoredInProject}
        <p class="warning">
          {$_('options.storedWarning')}
        </p>
      {/if}

      <label class="option">
        <input type="checkbox" bind:checked={$options.turbo}>
        {$_('options.turbo')}
      </label>
      <div class="option">
        <label>
          {$_('options.framerate')}
          <input type="number" min="0" max="240" bind:value={$options.framerate}>
        </label>
        <LearnMore slug="custom-fps" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" bind:checked={$options.interpolation}>
          {$_('options.interpolation')}
        </label>
        <LearnMore slug="interpolation" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" bind:checked={$options.highQualityPen}>
          {$_('options.highQualityPen')}
        </label>
        <LearnMore slug="high-quality-pen" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" checked={$options.maxClones === Infinity} on:change={(e) => {
            $options.maxClones = e.target.checked ? Infinity : 300;
          }}>
          {$_('options.infiniteClones')}
        </label>
        <LearnMore slug="infinite-clones" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" checked={!$options.fencing} on:change={(e) => {
            $options.fencing = !e.target.checked;
          }}>
          {$_('options.removeFencing')}
        </label>
        <LearnMore slug="remove-fencing" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" checked={!$options.miscLimits} on:change={(e) => {
            $options.miscLimits = !e.target.checked;
          }}>
          {$_('options.removeMiscLimits')}
        </label>
        <LearnMore slug="remove-misc-limits" />
      </div>
      <label class="option">
        {$_('options.username')}
        <input type="text" class="shorter" bind:value={$options.username}>
      </label>
      <label class="option">
        <input type="checkbox" bind:checked={$options.closeWhenStopped}>
        {$_('options.closeWhenStopped')}
      </label>

      <h3>{$_('options.stage')}</h3>
      <label class="option">
        {$_('options.stageSize')}
        <input type="number" min="1" max="4096" step="1" bind:value={$options.stageWidth}>
        &times;
        <input type="number" min="1" max="4096" step="1" bind:value={$options.stageHeight}>
        <LearnMore slug="custom-stage-size" />
      </label>
      <div class="group">
        <label class="option">
          <input type="radio" name="resize-mode" value="preserve-ratio" bind:group={$options.resizeMode}>
          {$_('options.preserveRatio')}
        </label>
        <label class="option">
          <input type="radio" name="resize-mode" value="stretch" bind:group={$options.resizeMode}>
          {$_('options.stretch')}
        </label>
        <label class="option">
          <input type="radio" name="resize-mode" value="dynamic-resize" bind:group={$options.resizeMode}>
          {$_('options.dynamicResize')}
          <LearnMore slug="packager/dynamic-stage-resize" />
        </label>
      </div>
    </div>
  </Section>

  <Section
    reset={() => {
      $customCursorIcon = null;
      resetOptions([
        'cursor',
        'chunks',
        'monitors'
      ]);
    }}
  >
    <div>
      <h2>{$_('options.interaction')}</h2>
      <div class="group">
        <label class="option">
          <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="auto">
          {$_('options.normalCursor')}
        </label>
        <label class="option">
          <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="none">
          {$_('options.noCursor')}
        </label>
        <label class="option">
          <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="custom">
          {$_('options.customCursor')}
        </label>
      </div>
      {#if $options.cursor.type === 'custom'}
        <div in:slide|self class="option">
          <ImageInput bind:file={$customCursorIcon} previewSizes={[[32, 32], [16, 16]]} />
          <p class="help">{$_('options.cursorHelp')}</p>
          <label class="option">
            {$_('options.cursorCenter')}
            <!-- X: and Y: intentionally not translated -->
            X: <input type="number" min="0" bind:value={$options.cursor.center.x}>
            Y: <input type="number" min="0" bind:value={$options.cursor.center.y}>
            <button
              on:click={automaticallyCenterCursor}
              disabled={!$customCursorIcon}
            >
              {$_('options.automaticallyCenter')}
            </button>
          </label>
        </div>
      {/if}

      <label class="option">
        <input type="checkbox" bind:checked={$options.chunks.pointerlock}>
        {$_('options.pointerlock')}
      </label>
      <label class="option">
        <input type="checkbox" bind:checked={$options.chunks.gamepad}>
        {$_('options.gamepad')}
      </label>

      <h3>{$_('options.monitors')}</h3>
      <label class="option">
        <input type="checkbox" bind:checked={$options.monitors.editableLists}>
        {$_('options.editableLists')}
      </label>
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="option">
        <ColorPicker bind:value={$options.monitors.variableColor} />
        {$_('options.variableColor')}
      </label>
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="option">
        <ColorPicker bind:value={$options.monitors.listColor} />
        {$_('options.listColor')}
      </label>
    </div>
  </Section>

  <Section
    reset={() => {
      resetOptions([
        'compiler',
        'bakeExtensions',
        'custom',
        'projectId',
        'packagedRuntime',
        'maxTextureDimension'
      ]);
    }}
  >
    <div>
      <h2>{$_('options.advancedOptions')}</h2>

      <div class="option">
        <label>
          <input type="checkbox" bind:checked={$options.compiler.enabled}>
          {$_('options.enableCompiler')}
        </label>
        <LearnMore slug="disable-compiler" />
      </div>
      <div class="option">
        <label>
          <input type="checkbox" bind:checked={$options.compiler.warpTimer}>
          {$_('options.warpTimer')}
        </label>
        <LearnMore slug="warp-timer" />
      </div>

      <label class="option">
        <input type="checkbox" bind:checked={$options.bakeExtensions}>
        {$_('options.bakeExtensions')}
      </label>

      <label class="option">
        {$_('options.customCSS')}
        <textarea bind:value={$options.custom.css}></textarea>
      </label>
      <label class="option">
        {$_('options.customJS')}
        <textarea bind:value={$options.custom.js}></textarea>
      </label>

      <label class="option">
        {$_('options.projectId')}
        <input type="text" bind:value={$options.projectId}>
      </label>
      <p class="help">{$_('options.projectIdHelp')}</p>

      <label class="option">
        <input type="checkbox" bind:checked={$options.packagedRuntime} />
        {$_('options.packagedRuntime')}
      </label>

      <label class="option">
        <input type="checkbox" checked={$options.maxTextureDimension !== defaultOptions.maxTextureDimension} on:change={(e) => {
          $options.maxTextureDimension = defaultOptions.maxTextureDimension * (e.target.checked ? 2 : 1);
        }} />
        {$_('options.maxTextureDimension')}
      </label>
    </div>
  </Section>

  {#if projectData.project.analysis.usesSteamworks}
    <Section
      reset={() => {
        resetOptions([
          'steamworks'
        ]);
      }}
    >
      <h2>{$_('options.steamworksExtension')}</h2>
      {#if ['electron-win64', 'electron-linux64', 'electron-mac'].includes($options.target)}
        <p>{$_('options.steamworksAvailable').replace('{n}', '480')}</p>
        <label class="option">
          {$_('options.steamworksAppId')}
          <input pattern="\d+" minlength="1" bind:value={$options.steamworks.appId}>
        </label>
        <label class="option">
          {$_('options.steamworksOnError')}
          <select bind:value={$options.steamworks.onError}>
            <option value="ignore">{$_('options.steamworksIgnore')}</option>
            <option value="warning">{$_('options.steamworksWarning')}</option>
            <option value="error">{$_('options.steamworksError')}</option>
          </select>
        </label>

        {#if $options.target === 'electron-mac'}
          <p class="warning">
            {$_('options.steamworksMacWarning')}
          </p>
        {/if}
      {:else}
        <p>{$_('options.steamworksUnavailable')}</p>
        <ul>
          <li>{$_('options.application-win64').replace('{type}', 'Electron')}</li>
          <li>
            {$_('options.application-mac').replace('{type}', 'Electron')}
            <br>
            {$_('options.steamworksMacWarning')}
          </li>
          <li>{$_('options.application-linux64').replace('{type}', 'Electron')}</li>
        </ul>
      {/if}
    </Section>
  {/if}

  <Section>
    <DropArea on:drop={(e) => importOptionsFromDataTransfer(e.detail)}>
      <h2>{$_('pebble.settingsFile')}</h2>
      <p class="help">{$_('pebble.settingsFileHelp')}</p>
      <div class="buttons">
        <Button on:click={exportOptions} secondary text={$_('options.export')} />
        <Button on:click={importOptions} secondary text={$_('options.import')} />
        <div class="side-buttons">
          <Button on:click={resetAll} dangerous text={$_('options.resetAll')} />
        </div>
      </div>
    </DropArea>
  </Section>
</details>

</div>

<aside class="side">
  <Section>
    <h2>{$_('pebble.preview')}</h2>
    <LivePreview options={$options} project={projectData.project} />
  </Section>

  <Section>
    <Button wide on:click={pack} disabled={$progress.visible} text={$_('pebble.package')} />
    {#if $progress.visible}
      <div class="package-progress">
        <Progress progress={$progress.progress} text={$progress.text} />
      </div>
    {:else if !result}
      <p class="help">{$_('options.downloadsWillAppearHere')}</p>
    {/if}
  </Section>

  {#if result}
    <Downloads
      name={result.filename}
      url={result.url}
      blob={result.blob}
    />
  {/if}
</aside>
</div>
