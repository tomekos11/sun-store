<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/85 backdrop-blur">
    <UContainer class="flex h-14 items-center justify-between gap-4">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 font-bold tracking-tight text-highlighted"
      >
        <span class="flex size-7 items-center justify-center rounded-md bg-primary text-inverted">
          <UIcon
            name="i-lucide-sun"
            class="size-4.5"
          />
        </span>
        sun.store
        <span class="hidden text-sm font-normal text-muted sm:inline">B2B solar marketplace</span>
      </NuxtLink>
      <UColorModeButton />
    </UContainer>
  </header>
</template>
