<script>
  import {createEventDispatcher} from 'svelte';
  import {_} from '../locales/';
  import icon from './reset.svg';

  const dispatch = createEventDispatcher();

  const click = () => {
    if (confirm($_('reset.confirm'))) {
      dispatch('click');
    }
  };
</script>

<style>
  button {
    width: 26px;
    height: 26px;
    margin: 0;
    padding: 4px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
  }
  button:hover {
    background: var(--hover);
  }
  button:active {
    background: var(--hover);
    filter: brightness(1.5);
  }
  img {
    width: 100%;
    height: 100%;
  }
  :global([theme="grey"]) img,
  :global([theme="dark"]) img {
    filter: invert(100%);
  }
</style>

<button on:click={click}>
  <img
    src={icon}
    draggable={false}
    alt={$_('reset.reset')}
    title={$_('reset.reset')}
  >
</button>
