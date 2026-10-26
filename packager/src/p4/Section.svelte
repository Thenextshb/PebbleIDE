<script>
  import ResetButton from './ResetButton.svelte';

  export let caption = false;
  export let center = false;
  export let modal = false;
  export let reset;
</script>

<style>
  .card {
    max-width: 640px;
    margin: auto;
    border-radius: 8px;
    background-color: var(--card);
    border: 1px solid var(--border);
    padding: 1em 1.25em;
    margin-top: 1em;
    margin-bottom: 1em;
  }
  .caption {
    font-style: italic;
    color: var(--text-muted);
  }
  .modal {
    width: 100%;
    max-width: 400px;
    margin: 0 8px;
  }
  .center {
    min-height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .reset {
    float: right;
  }
</style>

<div
  class="card"
  class:caption
  class:modal
  class:center={caption || center}
>
  {#if reset}
    <div class="reset">
      <ResetButton on:click={reset} />
    </div>
  {/if}
  <slot></slot>
</div>
