<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, homePath } from '#lib/auth.svelte.ts';

	$effect(() => {
		if (auth.user) goto(homePath(), { replaceState: true });
	});
</script>
