import mermaid from 'mermaid';
import { icons } from '@iconify-json/fluent';
mermaid.registerIconPacks([
  {
    name: icons.prefix, // To use the prefix defined in the icon pack
    icons,
  },
]);