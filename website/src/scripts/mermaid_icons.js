import { icons } from '@iconify-json/fluent';
import mermaid from 'mermaid';
mermaid.registerIconPacks([
  {
    name: icons.prefix, // To use the prefix defined in the icon pack
    icons,
  },
]);