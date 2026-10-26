<script>
  import {_} from '../locales/';
  import {fade} from 'svelte/transition';
  import Section from './Section.svelte';
  import SelectProject from './SelectProject.svelte';
  import SelectLocale from './SelectLocale.svelte';
  import SelectTheme from './SelectTheme.svelte';
  import Progress from './Progress.svelte';
  import Modals from './Modals.svelte';
  import {progress, theme, error} from './stores';
  import {isSupported, isSafari, version} from './environment';
  import {APP_NAME} from '../packager/brand';
  import logo from './pebble-logo.svg';

  let projectData;

  $: document.documentElement.setAttribute('theme', $theme);

  let modalVisible = false;

  const defaultTitle = document.title;
  let title = '';
  $: document.title = projectData && title ? `${title} - ${APP_NAME}` : defaultTitle;

  const getPackagerOptionsComponent = () => import(
    /* webpackChunkName: "packager-options-ui" */
    './PackagerOptions.svelte'
  ).catch((err) => {
    $error = err;
  });

  // We know for sure we will need this component very soon, so start loading it immediately.
  getPackagerOptionsComponent();
</script>

<style>
  :root {
    --page: #333333;
    --header: #2b2b2b;
    --card: #3d3d3d;
    --text: #e6e6e6;
    --text-muted: #b3b3b3;
    --border: #4d4d4d;
    --input-background: #2b2b2b;
    --input-border: #666666;
    --input-border-hover: #999999;
    --hover: rgba(255, 255, 255, 0.1);
    --link: #ffffff;
    --accent: #ffffff;
    --accent-text: #333333;
    --danger: #ff8080;
    --overlay: rgba(0, 0, 0, 0.8);
    color-scheme: dark;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: var(--page);
    color: var(--text);
  }
  :global([theme="light"]) {
    --page: #f2f2f2;
    --header: #7d7d7d;
    --card: #ffffff;
    --text: #333333;
    --text-muted: #666666;
    --border: #d9d9d9;
    --input-background: #ffffff;
    --input-border: #a0a0a0;
    --input-border-hover: #333333;
    --hover: rgba(0, 0, 0, 0.08);
    --link: #333333;
    --accent: #7d7d7d;
    --accent-text: #ffffff;
    --danger: #cc3333;
    --overlay: rgba(255, 255, 255, 0.85);
    color-scheme: light;
  }
  :global([theme="dark"]) {
    --page: #111111;
    --header: #1e1e1e;
    --card: #1e1e1e;
    --text: #eeeeee;
    --text-muted: #aaaaaa;
    --border: #333333;
    --input-background: #2b2b2b;
    --input-border: #555555;
    --input-border-hover: #999999;
    --hover: rgba(255, 255, 255, 0.1);
    --link: #ffffff;
    --accent: #ffffff;
    --accent-text: #111111;
    --danger: #ff8080;
    --overlay: rgba(0, 0, 0, 0.8);
    color-scheme: dark;
  }
  :global(body) {
    margin: 0;
  }
  :global(a) {
    color: var(--link);
  }
  :global(input[type="text"]),
  :global(input[type="number"]),
  :global(textarea) {
    padding: 4px 6px;
  }
  :global(input[type="text"]),
  :global(input[type="number"]),
  :global(textarea),
  :global(.is-not-safari select) {
    background-color: var(--input-background);
    color: var(--text);
    border: 1px solid var(--input-border);
    border-radius: 4px;
  }
  :global(.is-not-safari select) {
    padding: 3px 4px;
  }
  :global(.is-not-safari select:hover) {
    border-color: var(--input-border-hover);
  }
  :global(input[type="checkbox"]),
  :global(input[type="radio"]) {
    accent-color: var(--accent);
  }
  :global(p), :global(h1), :global(h2), :global(h3) {
    margin: 12px 0;
  }
  :global(h2) {
    font-size: 1.25em;
  }
  :global(h3) {
    font-size: 1em;
  }
  :global(summary) {
    cursor: pointer;
  }
  :global(input) {
    font-size: 0.85em;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--header);
    color: #ffffff;
  }
  .header h1 {
    font-size: 1.25em;
    margin: 0;
  }
  .header-controls {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  main {
    padding: 0 16px 16px;
  }
  .intro {
    max-width: 640px;
    margin: 1em auto 0;
    color: var(--text-muted);
  }
  footer {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85em;
  }
  footer > div {
    margin-top: 12px;
  }
  .version {
    opacity: 0.8;
  }
</style>

<Modals bind:modalVisible={modalVisible} />

<header class="header" aria-hidden={modalVisible}>
  <img src={logo} alt="" width="29" height="36" draggable="false">
  <h1>{APP_NAME}</h1>
  <div class="header-controls">
    <SelectTheme />
    <SelectLocale />
  </div>
</header>

<main aria-hidden={modalVisible} class:is-not-safari={!isSafari}>
  <p class="intro">{$_('pebble.description')}</p>

  {#if isSupported}
    <SelectProject bind:projectData />
  {:else}
    <Section>
      <h2>{$_('p4.browserNotSupported')}</h2>
      <p>{$_('p4.browserNotSupportedDescription')}</p>
    </Section>
  {/if}

  {#if projectData}
    {#await getPackagerOptionsComponent()}
      <Section center>
        <Progress text={$_('p4.importingInterface')} />
      </Section>
    {:then { default: PackagerOptions }}
      <div in:fade>
        <PackagerOptions
          projectData={projectData}
          bind:title={title}
        />
      </div>
    {:catch}
      <Section center>
        <p>
          {$_('p4.unknownImportError')}
        </p>
      </Section>
    {/await}
  {:else if $progress.visible}
    <Section center>
      <Progress progress={$progress.progress} text={$progress.text} />
    </Section>
  {/if}

  <footer>
    <div>{$_('pebble.disclaimer')}</div>
    {#if version}
      <div class="version">{version}</div>
    {/if}
  </footer>
</main>
