<script>
  import {createEventDispatcher} from 'svelte';
  import {fade} from 'svelte/transition';
  import {_} from '../locales/';

  const dispatch = createEventDispatcher();

  const cancel = () => {
    dispatch('cancel');
  };
</script>

<style>
  .outer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 20;
    background: var(--overlay);
    color: var(--text);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    user-select: none;
  }
  .inner {
    max-width: 480px;
  }
</style>

<div class="outer" out:fade={{duration: 200}}>
  <div class="inner">
    <h2>{$_('import.header')}</h2>
    <p>
      {$_('import.description')}
    </p>
    <button on:click={cancel}>{$_('import.cancel')}</button>
  </div>
</div>
