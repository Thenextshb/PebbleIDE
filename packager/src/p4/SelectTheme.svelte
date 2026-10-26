<script>
  import {theme} from './stores';
  import {_} from '../locales';
</script>

<select bind:value={$theme} aria-label={$_('pebble.mode')}>
  <option value="grey">{$_('theme.grey')}</option>
  <option value="light">{$_('theme.light')}</option>
  <option value="dark">{$_('theme.dark')}</option>
</select>
