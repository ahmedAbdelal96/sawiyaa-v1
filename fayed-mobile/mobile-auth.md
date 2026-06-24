<!-- Design System -->
<!DOCTYPE html>

<html dir="rtl" lang="ar"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, viewport-fit=cover" name="viewport"/>
<title>ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø±ÙŠØ¶ - Sawiyaa</title>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&amp;family=IBM+Plex+Sans:wght@500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-secondary-fixed": "#0c1d28",
                        "surface-container-highest": "#e1e3e4",
                        "on-background": "#191c1d",
                        "surface-tint": "#006a6a",
                        "inverse-surface": "#2e3132",
                        "surface-container-high": "#e7e8e9",
                        "tertiary-fixed": "#d4e6e6",
                        "secondary": "#50606d",
                        "on-secondary-fixed-variant": "#384955",
                        "surface-container-lowest": "#ffffff",
                        "tertiary-fixed-dim": "#b8caca",
                        "surface": "#f8f9fa",
                        "on-primary": "#ffffff",
                        "on-primary-fixed-variant": "#004f4f",
                        "on-primary-container": "#e3fffe",
                        "on-surface": "#191c1d",
                        "surface-container-low": "#f3f4f5",
                        "secondary-fixed-dim": "#b7c9d8",
                        "primary-fixed": "#93f2f2",
                        "on-secondary": "#ffffff",
                        "background": "#f8f9fa",
                        "on-primary-fixed": "#002020",
                        "on-tertiary-container": "#ebfdfd",
                        "surface-container": "#edeeef",
                        "error-container": "#ffdad6",
                        "error": "#ba1a1a",
                        "on-tertiary": "#ffffff",
                        "on-error": "#ffffff",
                        "on-error-container": "#93000a",
                        "tertiary-container": "#657676",
                        "secondary-container": "#d0e2f1",
                        "surface-dim": "#d9dadb",
                        "surface-variant": "#e1e3e4",
                        "on-surface-variant": "#3e4949",
                        "on-secondary-container": "#546572",
                        "outline-variant": "#bdc9c8",
                        "on-tertiary-fixed": "#0e1e1f",
                        "primary-fixed-dim": "#76d6d5",
                        "tertiary": "#4d5d5e",
                        "surface-bright": "#f8f9fa",
                        "primary-container": "#008080",
                        "inverse-on-surface": "#f0f1f2",
                        "outline": "#6e7979",
                        "primary": "#006565",
                        "inverse-primary": "#76d6d5",
                        "secondary-fixed": "#d3e5f4",
                        "on-tertiary-fixed-variant": "#3a4a4a"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "stack-lg": "24px",
                        "mobile-padding": "20px",
                        "stack-sm": "8px",
                        "container-max": "1200px",
                        "gutter": "16px",
                        "desktop-padding": "24px",
                        "stack-md": "16px"
                    },
                    "fontFamily": {
                        "body-lg": ["Manrope"],
                        "body-md": ["Manrope"],
                        "headline-sm": ["Manrope"],
                        "label-sm": ["IBM Plex Sans"],
                        "label-md": ["IBM Plex Sans"],
                        "headline-lg": ["Manrope"],
                        "headline-md": ["Manrope"]
                    },
                    "fontSize": {
                        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
                        "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
                        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" }],
                        "headline-lg": ["30px", { "lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }]
                    }
                }
            }
        }
    </script>
<style>
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .pt-safe { padding-top: env(safe-area-inset-top); }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased pt-safe pb-safe selection:bg-primary-container selection:text-on-primary-container">
<!-- TopAppBar Semantic Shell -->
<header class="bg-surface shadow-sm docked full-width top-0 z-40 sticky">
<div class="flex items-center justify-between px-mobile-padding h-14 w-full max-w-container-max mx-auto">
<button aria-label="Back" class="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 active:scale-95 opacity-80">
<span class="material-symbols-outlined transform scale-x-[-1]">arrow_back</span>
</button>
<div class="font-headline-sm text-headline-sm font-bold text-primary dark:text-primary-fixed">
                Sawiyaa
            </div>
<button aria-label="Help" class="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2 active:scale-95 opacity-80">
<span class="material-symbols-outlined">help_outline</span>
</button>
</div>
</header>
<main class="flex-grow flex items-center justify-center p-mobile-padding w-full max-w-container-max mx-auto">
<div class="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-8">
<div class="text-center mb-stack-lg">
<h1 class="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø±ÙŠØ¶</h1>
<p class="font-body-md text-body-md text-on-surface-variant">Ø§Ø¯Ø®Ù„ Ø¥Ù„Ù‰ Ø­Ø³Ø§Ø¨Ùƒ Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¬Ù„Ø³Ø§ØªÙƒ ÙˆØ±Ø­Ù„ØªÙƒ Ø§Ù„Ø¹Ù„Ø§Ø¬ÙŠØ©.</p>
</div>
<form action="#" class="space-y-stack-md" method="POST">
<div>
<label class="block font-label-md text-label-md text-on-surface mb-1" for="email">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ</label>
<div class="relative">
<span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-on-surface-variant">
<span class="material-symbols-outlined text-[20px]">mail</span>
</span>
<input class="block w-full h-[56px] pl-3 pr-10 rounded-lg border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-body-md text-body-md" dir="ltr" id="email" name="email" placeholder="name@example.com" required="" type="email"/>
</div>
</div>
<div>
<label class="block font-label-md text-label-md text-on-surface mb-1" for="password">ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</label>
<div class="relative">
<span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-on-surface-variant">
<span class="material-symbols-outlined text-[20px]">lock</span>
</span>
<input class="block w-full h-[56px] pl-3 pr-10 rounded-lg border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-body-md text-body-md" dir="ltr" id="password" name="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required="" type="password"/>
</div>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center">
<input class="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-lowest cursor-pointer" id="remember-me" name="remember-me" type="checkbox"/>
<label class="ml-2 mr-2 block font-label-md text-label-md text-on-surface-variant cursor-pointer" for="remember-me">
                            ØªØ°ÙƒØ±Ù†ÙŠ
                        </label>
</div>
<a class="font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant transition-colors" href="#">
                        Ù‡Ù„ Ù†Ø³ÙŠØª ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±ØŸ
                    </a>
</div>
<button class="w-full flex justify-center items-center h-[56px] rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all active:scale-[0.98]" type="submit">
                    ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
                </button>
</form>
<div class="mt-stack-lg mb-stack-lg relative">
<div aria-hidden="true" class="absolute inset-0 flex items-center">
<div class="w-full border-t border-outline-variant"></div>
</div>
<div class="relative flex justify-center text-sm">
<span class="px-2 bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm">Ø£Ùˆ</span>
</div>
</div>
<button class="w-full flex justify-center items-center h-[56px] rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all active:scale-[0.98]" type="button">
<img alt="Google logo" class="h-5 w-5 ml-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1gR5LqWLebQNqd3QFaLBLEkeVvKjoBKeitNjDJLO0g1Vd_2iT_gR3ovzWVmiaQRvWz2LR5wvt28dtd5oD214VScqsWLW6vGZhaHNz0qyyRuEjsG26dTt02g1VCnpZ63Qn_mzq2NvGM8D-8AmRQneXJ1s29OYzxTJ-bwibN5JugJB4dVERed2ZPpGVzZ4WUeKEMQ2yylOG3rqRAEKGsnMVQ264A7T65Yqkn2pFTsfhf5UPLSL1ph2Y6PLRjB4AV6joL-XU_FbcGDQ"/>
                Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Google
            </button>
<div class="mt-stack-lg text-center">
<p class="font-body-md text-body-md text-on-surface-variant">
                    Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ Ø­Ø³Ø§Ø¨ØŸ
                    <a class="font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant transition-colors mr-1" href="#">Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨Ù‹Ø§</a>
</p>
</div>
</div>
</main>
<!-- BottomNavBar and FAB Suppressed as per instructions for Transactional/Login screen -->
</body></html>

<!-- Patient Sign In -->
<!DOCTYPE html>

<html dir="rtl" lang="ar"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"/>
<title>Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ù…Ø±ÙŠØ¶ - Sawiyaa</title>
<!-- Fonts & Icons -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&amp;family=IBM+Plex+Sans:wght@400;500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Tailwind Config -->
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
                    "on-secondary-fixed": "#0c1d28",
                    "surface-container-highest": "#e1e3e4",
                    "on-background": "#191c1d",
                    "surface-tint": "#006a6a",
                    "inverse-surface": "#2e3132",
                    "surface-container-high": "#e7e8e9",
                    "tertiary-fixed": "#d4e6e6",
                    "secondary": "#50606d",
                    "on-secondary-fixed-variant": "#384955",
                    "surface-container-lowest": "#ffffff",
                    "tertiary-fixed-dim": "#b8caca",
                    "surface": "#f8f9fa",
                    "on-primary": "#ffffff",
                    "on-primary-fixed-variant": "#004f4f",
                    "on-primary-container": "#e3fffe",
                    "on-surface": "#191c1d",
                    "surface-container-low": "#f3f4f5",
                    "secondary-fixed-dim": "#b7c9d8",
                    "primary-fixed": "#93f2f2",
                    "on-secondary": "#ffffff",
                    "background": "#f8f9fa",
                    "on-primary-fixed": "#002020",
                    "on-tertiary-container": "#ebfdfd",
                    "surface-container": "#edeeef",
                    "error-container": "#ffdad6",
                    "error": "#ba1a1a",
                    "on-tertiary": "#ffffff",
                    "on-error": "#ffffff",
                    "on-error-container": "#93000a",
                    "tertiary-container": "#657676",
                    "secondary-container": "#d0e2f1",
                    "surface-dim": "#d9dadb",
                    "surface-variant": "#e1e3e4",
                    "on-surface-variant": "#3e4949",
                    "on-secondary-container": "#546572",
                    "outline-variant": "#bdc9c8",
                    "on-tertiary-fixed": "#0e1e1f",
                    "primary-fixed-dim": "#76d6d5",
                    "tertiary": "#4d5d5e",
                    "surface-bright": "#f8f9fa",
                    "primary-container": "#008080",
                    "inverse-on-surface": "#f0f1f2",
                    "outline": "#6e7979",
                    "primary": "#006565",
                    "inverse-primary": "#76d6d5",
                    "secondary-fixed": "#d3e5f4",
                    "on-tertiary-fixed-variant": "#3a4a4a"
            },
            borderRadius: {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            spacing: {
                    "stack-lg": "24px",
                    "mobile-padding": "20px",
                    "stack-sm": "8px",
                    "container-max": "1200px",
                    "gutter": "16px",
                    "desktop-padding": "24px",
                    "stack-md": "16px"
            },
            fontFamily: {
                    "body-lg": ["Manrope"],
                    "body-md": ["Manrope"],
                    "headline-sm": ["Manrope"],
                    "label-sm": ["IBM Plex Sans"],
                    "label-md": ["IBM Plex Sans"],
                    "headline-lg": ["Manrope"],
                    "headline-md": ["Manrope"]
            },
            fontSize: {
                    "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
                    "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                    "headline-sm": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
                    "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
                    "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "headline-lg": ["30px", {"lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                    "headline-md": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                    
                    "headline-lg-mobile": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
                    "headline-md-mobile": ["20px", {"lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                    "headline-sm-mobile": ["18px", {"lineHeight": "24px", "fontWeight": "600"}]
            }
          }
        }
      }
    </script>
<style>
        /* Base styles to handle safe areas and general layout */
        body {
            -webkit-tap-highlight-color: transparent;
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        }
        
        .material-symbols-outlined {
          font-variation-settings:
          'FILL' 0,
          'wght' 400,
          'GRAD' 0,
          'opsz' 24;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background min-h-screen flex flex-col items-center justify-center pt-[16px]">
<!-- Main Container -->
<main class="w-full max-w-[480px] px-mobile-padding py-stack-lg flex flex-col">
<!-- TopAppBar (Transactional - simplified) -->
<header class="flex items-center justify-between h-14 mb-stack-md w-full">
<button aria-label="Go back" class="text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-full p-2">
<!-- Flipped arrow for RTL -->
<span aria-hidden="true" class="material-symbols-outlined transform scale-x-[-1]">arrow_back</span>
</button>
<div class="font-headline-sm-mobile md:font-headline-sm text-headline-sm-mobile md:text-headline-sm font-bold text-primary">
                Sawiyaa
            </div>
<div class="w-10"></div> <!-- Spacer for center alignment -->
</header>
<!-- Content Card -->
<section class="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-mobile-padding md:p-desktop-padding flex flex-col gap-stack-lg">
<!-- Header Text -->
<div class="flex flex-col gap-stack-sm text-center">
<h1 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                    Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ù…Ø±ÙŠØ¶
                </h1>
<p class="font-body-md text-body-md text-on-surface-variant">
                    Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨Ùƒ Ù„Ø¨Ø¯Ø¡ Ø§Ù„Ø­Ø¬Ø² ÙˆÙ…ØªØ§Ø¨Ø¹Ø© Ø¬Ù„Ø³Ø§ØªÙƒ Ø¨Ø³Ù‡ÙˆÙ„Ø©.
                </p>
</div>
<!-- Form -->
<form action="#" class="flex flex-col gap-stack-md" method="POST" onsubmit="event.preventDefault();">
<!-- Display Name Input -->
<div class="flex flex-col gap-[4px]">
<label class="font-label-md text-label-md text-on-surface" for="displayName">Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„</label>
<div class="relative">
<span aria-hidden="true" class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant z-10 pointer-events-none">person</span>
<input class="w-full h-12 pl-4 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60" id="displayName" name="displayName" placeholder="Ø£Ø¯Ø®Ù„ Ø§Ø³Ù…Ùƒ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„" required="" type="text"/>
</div>
</div>
<!-- Email Input -->
<div class="flex flex-col gap-[4px]">
<label class="font-label-md text-label-md text-on-surface" for="email">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ</label>
<div class="relative">
<span aria-hidden="true" class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant z-10 pointer-events-none">mail</span>
<input class="w-full h-12 pl-4 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 text-right" dir="ltr" id="email" name="email" placeholder="example@email.com" required="" type="email"/>
</div>
</div>
<!-- Password Input -->
<div class="flex flex-col gap-[4px]">
<label class="font-label-md text-label-md text-on-surface" for="password">ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</label>
<div class="relative">
<span aria-hidden="true" class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant z-10 pointer-events-none">lock</span>
<input class="w-full h-12 pl-10 pr-10 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 text-right" dir="ltr" id="password" name="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required="" type="password"/>
<button aria-label="Toggle password visibility" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none" type="button">
<span aria-hidden="true" class="material-symbols-outlined">visibility_off</span>
</button>
</div>
<span class="font-label-sm text-label-sm text-on-surface-variant mt-1">ÙŠØ¬Ø¨ Ø£Ù† ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ 8 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„.</span>
</div>
<!-- Primary CTA -->
<button class="w-full h-12 mt-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" type="submit">
                    Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨
                    <!-- Flipped arrow for RTL -->
<span aria-hidden="true" class="material-symbols-outlined text-[20px] transform scale-x-[-1]">arrow_forward</span>
</button>
</form>
<!-- Divider -->
<div class="flex items-center gap-4 py-2">
<div class="flex-1 h-px bg-outline-variant/50"></div>
<span class="font-label-sm text-label-sm text-on-surface-variant">Ø£Ùˆ</span>
<div class="flex-1 h-px bg-outline-variant/50"></div>
</div>
<!-- Secondary CTA (Google) -->
<button class="w-full h-12 bg-surface-container-lowest border border-[#E1E4E8] text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-surface-variant focus:ring-offset-2" type="button">
<!-- SVG Google Icon (Simplified placeholder using standard element for compliance, though standard is image/svg, adhering strictly to text/css requests where possible, using a span for visual balance) -->
<svg class="w-5 h-5" fill="none" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
</svg>
                Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Google
            </button>
<!-- Bottom Link -->
<div class="text-center mt-2">
<a class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 group focus:outline-none rounded" href="#">
                    Ù„Ø¯ÙŠÙƒ Ø­Ø³Ø§Ø¨ Ø¨Ø§Ù„ÙØ¹Ù„ØŸ <span class="text-primary font-medium group-hover:underline">ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„</span>
</a>
</div>
</section>
<!-- Navigation Shell suppressed due to linear/transactional intent -->
</main>
<script>
        // Simple password toggle visibility script
        document.addEventListener('DOMContentLoaded', () => {
            const toggleBtns = document.querySelectorAll('button[aria-label="Toggle password visibility"]');
            
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const input = btn.previousElementSibling;
                    const icon = btn.querySelector('.material-symbols-outlined');
                    
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.textContent = 'visibility';
                        icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                    } else {
                        input.type = 'password';
                        icon.textContent = 'visibility_off';
                        icon.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
                    }
                });
            });
        });
    </script>
</body></html>

<!-- Patient Create Account -->
<!DOCTYPE html>

<html dir="rtl" lang="ar"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± - Sawiyaa</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&amp;family=IBM+Plex+Sans:wght@500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        [data-weight="fill"] {
            font-variation-settings: 'FILL' 1;
        }
    </style>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "on-secondary-fixed": "#0c1d28",
                        "surface-container-highest": "#e1e3e4",
                        "on-background": "#191c1d",
                        "surface-tint": "#006a6a",
                        "inverse-surface": "#2e3132",
                        "surface-container-high": "#e7e8e9",
                        "tertiary-fixed": "#d4e6e6",
                        "secondary": "#50606d",
                        "on-secondary-fixed-variant": "#384955",
                        "surface-container-lowest": "#ffffff",
                        "tertiary-fixed-dim": "#b8caca",
                        "surface": "#f8f9fa",
                        "on-primary": "#ffffff",
                        "on-primary-fixed-variant": "#004f4f",
                        "on-primary-container": "#e3fffe",
                        "on-surface": "#191c1d",
                        "surface-container-low": "#f3f4f5",
                        "secondary-fixed-dim": "#b7c9d8",
                        "primary-fixed": "#93f2f2",
                        "on-secondary": "#ffffff",
                        "background": "#f8f9fa",
                        "on-primary-fixed": "#002020",
                        "on-tertiary-container": "#ebfdfd",
                        "surface-container": "#edeeef",
                        "error-container": "#ffdad6",
                        "error": "#ba1a1a",
                        "on-tertiary": "#ffffff",
                        "on-error": "#ffffff",
                        "on-error-container": "#93000a",
                        "tertiary-container": "#657676",
                        "secondary-container": "#d0e2f1",
                        "surface-dim": "#d9dadb",
                        "surface-variant": "#e1e3e4",
                        "on-surface-variant": "#3e4949",
                        "on-secondary-container": "#546572",
                        "outline-variant": "#bdc9c8",
                        "on-tertiary-fixed": "#0e1e1f",
                        "primary-fixed-dim": "#76d6d5",
                        "tertiary": "#4d5d5e",
                        "surface-bright": "#f8f9fa",
                        "primary-container": "#008080",
                        "inverse-on-surface": "#f0f1f2",
                        "outline": "#6e7979",
                        "primary": "#006565",
                        "inverse-primary": "#76d6d5",
                        "secondary-fixed": "#d3e5f4",
                        "on-tertiary-fixed-variant": "#3a4a4a"
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    spacing: {
                        "stack-lg": "24px",
                        "mobile-padding": "20px",
                        "stack-sm": "8px",
                        "container-max": "1200px",
                        "gutter": "16px",
                        "desktop-padding": "24px",
                        "stack-md": "16px"
                    },
                    fontFamily: {
                        "body-lg": ["Manrope"],
                        "body-md": ["Manrope"],
                        "headline-sm": ["Manrope"],
                        "label-sm": ["IBM Plex Sans"],
                        "label-md": ["IBM Plex Sans"],
                        "headline-lg": ["Manrope"],
                        "headline-md": ["Manrope"]
                    },
                    fontSize: {
                        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
                        "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
                        "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
                        "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" }],
                        "headline-lg": ["30px", { "lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600" }]
                    }
                }
            }
        };
    </script>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background font-body-md min-h-screen flex flex-col pt-[16px]">
<!-- TopAppBar -->
<header class="flex items-center justify-between px-mobile-padding h-14 w-full max-w-container-max mx-auto bg-surface dark:bg-background shadow-sm dark:shadow-none docked full-width top-0 z-50">
<button aria-label="Ø§Ù„Ø¹ÙˆØ¯Ø©" class="text-primary dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors active:scale-95 active:opacity-80 flex items-center justify-center p-2 rounded-full">
<span class="material-symbols-outlined transform -scale-x-100" data-icon="arrow_back">arrow_back</span>
</button>
<h1 class="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">Sawiyaa</h1>
<button aria-label="Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø©" class="text-primary dark:text-primary-fixed-dim hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors active:scale-95 active:opacity-80 flex items-center justify-center p-2 rounded-full">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="flex-grow flex flex-col justify-center items-center px-mobile-padding w-full max-w-[400px] mx-auto py-8">
<!-- Form State -->
<div class="w-full transition-opacity duration-300" id="reset-form">
<div class="mb-8 text-center">
<div class="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
<span class="material-symbols-outlined text-4xl" data-icon="lock_reset">lock_reset</span>
</div>
<h2 class="font-headline-lg text-headline-lg mb-2">Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±</h2>
<p class="font-body-md text-body-md text-on-surface-variant">Ø£Ø¯Ø®Ù„ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙˆØ³Ù†Ø±Ø³Ù„ Ù„Ùƒ Ø±Ù…Ø² Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ¹ÙŠÙŠÙ†.</p>
</div>
<form class="space-y-6" onsubmit="event.preventDefault(); document.getElementById('reset-form').classList.add('hidden', 'opacity-0'); document.getElementById('success-state').classList.remove('hidden', 'opacity-0'); document.getElementById('success-state').classList.add('flex', 'opacity-100');">
<div>
<label class="block font-label-md text-label-md text-on-surface mb-2" for="email">Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ</label>
<input class="w-full h-[56px] px-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-left" dir="ltr" id="email" name="email" placeholder="name@example.com" required="" type="email"/>
</div>
<button class="w-full h-[56px] bg-primary text-on-primary font-label-md text-label-md rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center" type="submit">
                    Ø¥Ø±Ø³Ø§Ù„ Ø±Ù…Ø² Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©
                </button>
</form>
</div>
<!-- Success State (Initially Hidden) -->
<div class="w-full hidden opacity-0 flex-col items-center text-center transition-opacity duration-500 delay-150" id="success-state">
<div class="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mb-6 text-primary-fixed-dim">
<span class="material-symbols-outlined text-5xl" data-icon="mark_email_read" data-weight="fill">mark_email_read</span>
</div>
<h2 class="font-headline-lg text-headline-lg mb-4">ØªØ­Ù‚Ù‚ Ù…Ù† Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ</h2>
<p class="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-[300px]">
                Ø£Ø±Ø³Ù„Ù†Ø§ Ø±Ù…Ø² Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³Ø¬Ù„Ù‹Ø§ Ù„Ø¯ÙŠÙ†Ø§.
            </p>
<a class="w-full h-[56px] bg-primary text-on-primary font-label-md text-label-md rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center" href="#" onclick="location.reload();">
                Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
            </a>
</div>
<!-- Shared Footer Link -->
<div class="mt-8 text-center w-full">
<a class="font-label-md text-label-md text-primary hover:underline" href="#" onclick="if(!document.getElementById('success-state').classList.contains('hidden')){location.reload();}">
                Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„
            </a>
</div>
</main>
</body></html>
