import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        container: {
            center: true,
            padding: '1rem',
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1280px',
            },
        },
        extend: {
            colors: {
                primary: "var(--color-primary)",
                secondary: "var(--color-primary)",
                accent: "var(--color-accent)",
                "accent-hover": "var(--color-accent-hover)",
                background: "var(--color-background)",
                "background-alt": "var(--color-background-alt)",
                surface: "var(--color-surface)",
                text: "var(--color-text-main)",
                "text-light": "var(--color-text-light)",
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
