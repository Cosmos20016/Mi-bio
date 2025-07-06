import { vitePreprocess } from "@astrojs/svelte";

export default {
  preprocess: [vitePreprocess({ script: true })],
};
import demoBanner from '../assets/images/demo-banner.png';
<img src={demoBanner} alt="demo banner" />
