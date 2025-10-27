<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";

interface Props {
	title: string;
	url: string;
}

let { title, url }: Props = $props();

// Encode text for URL sharing
function encodeText(text: string): string {
	return encodeURIComponent(text);
}

// Generate sharing URLs for different platforms
const shareUrls = $derived({
	twitter: `https://twitter.com/intent/tweet?text=${encodeText(title)}&url=${encodeText(url)}`,
	facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeText(url)}`,
	linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeText(url)}`,
	whatsapp: `https://wa.me/?text=${encodeText(`${title} ${url}`)}`,
});

// Share button configuration
const shareButtons = [
	{
		name: "Twitter",
		icon: "fa6-brands:x-twitter",
		url: shareUrls.twitter,
		color: "hover:text-[#1DA1F2]",
		bgColor: "hover:bg-[#1DA1F2]/10",
	},
	{
		name: "Facebook",
		icon: "fa6-brands:facebook",
		url: shareUrls.facebook,
		color: "hover:text-[#1877F2]",
		bgColor: "hover:bg-[#1877F2]/10",
	},
	{
		name: "LinkedIn",
		icon: "fa6-brands:linkedin",
		url: shareUrls.linkedin,
		color: "hover:text-[#0A66C2]",
		bgColor: "hover:bg-[#0A66C2]/10",
	},
	{
		name: "WhatsApp",
		icon: "fa6-brands:whatsapp",
		url: shareUrls.whatsapp,
		color: "hover:text-[#25D366]",
		bgColor: "hover:bg-[#25D366]/10",
	},
];

function openShareWindow(url: string, platform: string): void {
	const width = 550;
	const height = 420;
	const left = (window.screen.width - width) / 2;
	const top = (window.screen.height - height) / 2;

	window.open(
		url,
		`share-${platform}`,
		`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
	);
}
</script>

<div class="share-buttons-container">
	<div class="flex items-center gap-2 mb-3">
		<Icon icon="material-symbols:share-outline" class="text-lg text-black/60 dark:text-white/60" />
		<span class="text-sm font-medium text-black/75 dark:text-white/75">
			{i18n(I18nKey.share) || "Compartir"}
		</span>
	</div>
	
	<div class="flex flex-wrap gap-2 sm:gap-3">
		{#each shareButtons as button}
			<button
				type="button"
				onclick={() => openShareWindow(button.url, button.name.toLowerCase())}
				class="group inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
					   transition-all duration-200 ease-in-out
					   bg-black/5 dark:bg-white/10 
					   {button.bgColor} {button.color}
					   hover:scale-105 active:scale-95
					   border border-transparent hover:border-current/20
					   text-black/70 dark:text-white/70
					   min-w-[2.75rem] sm:min-w-[auto]"
				aria-label={`Compartir en ${button.name}`}
				title={`Compartir en ${button.name}`}
			>
				<Icon 
					icon={button.icon} 
					class="text-lg sm:text-base flex-shrink-0" 
				/>
				<span class="hidden sm:inline text-sm font-medium">
					{button.name}
				</span>
			</button>
		{/each}
	</div>
</div>

<style>
.share-buttons-container {
	@apply p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10;
}

@media (max-width: 640px) {
	.share-buttons-container {
		@apply p-3;
	}
}
</style>