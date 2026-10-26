<script>
  export let secondary = false;
  export let dangerous = false;
  export let disabled = false;
  export let wide = false;
  export let text;
</script>

<style>
  button {
    font-family: inherit;
    font-size: 14px;
    font-weight: bold;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    margin: 0;
    cursor: pointer;
    background-color: var(--accent);
    color: var(--accent-text);
    border: 1px solid var(--accent);
    transition: filter 0.1s;
  }
  button:hover {
    filter: brightness(0.9);
  }
  button:active {
    filter: brightness(0.8);
  }
  .secondary {
    background-color: transparent;
    color: var(--text);
    border-color: var(--input-border);
  }
  .secondary:hover {
    filter: none;
    background-color: var(--hover);
  }
  .dangerous {
    background-color: transparent;
    color: var(--danger);
    border-color: var(--danger);
  }
  .dangerous:hover {
    filter: none;
    background-color: var(--hover);
  }
  .wide {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 16px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
    filter: none;
  }
</style>

<button
  on:click
  class:secondary
  class:dangerous
  class:wide
  {disabled}
>
  {text}
</button>
