import { defineConfig } from "vite-plus";
import solid from "@solidjs/vite-plugin";
import { ui } from "@rimelight/ui/plugin";
import { i18n } from "@rimelight/i18n/plugin";
import { fileRoutes } from "filesystem-routing/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  plugins: [
    ...(process.env['CLOUDFLARE_BUILD']==='1' ? [cloudflare()] : []),
    solid(),
    fileRoutes({types:"src/file-routes.d.ts",codeSplitting:false}),
    i18n(),
    ui({
      fonts:{fonts:{sans:[{name:'Noto Sans',weights:[400,500,600,700],subsets:['latin','latin-ext']}],serif:[],mono:[]}},
      colors: {
        primary: {
          light: {
            50: "#4b3000",
            100: "#674100",
            200: "#805000",
            300: "#ffbf00",
            400: "#ffca24",
            500: "#ffbf00",
            600: "#d99c00",
            700: "#c79936",
            800: "#e8cf93",
            900: "#f6e7bf",
            950: "#fff7e2",
          },
          dark: {
            50: "#fff8dc",
            100: "#ffecae",
            200: "#ffdd70",
            300: "#ffda4f",
            400: "#ffc91a",
            500: "#ffbf00",
            600: "#d99c00",
            700: "#805b00",
            800: "#503700",
            900: "#302100",
            950: "#1c1400",
          },
        },
        secondary: {
          light: {
            50: "#4b3000",
            100: "#674100",
            200: "#805000",
            300: "#ffbf00",
            400: "#ffca24",
            500: "#ffbf00",
            600: "#d99c00",
            700: "#c79936",
            800: "#f6e7bf",
            900: "#fbf1d7",
            950: "#fff9ea",
          },
          dark: {
            50: "#fff8dc",
            100: "#ffecae",
            200: "#ffdd70",
            300: "#ffda4f",
            400: "#ffc91a",
            500: "#ffbf00",
            600: "#d99c00",
            700: "#805b00",
            800: "#302100",
            900: "#1c1400",
            950: "#100b00",
          },
        },
      },
      unocss: {
        safelist: [
  "i-lucide-activity",
  "i-lucide-arrow-up-right",
  "i-lucide-chart-no-axes-combined",
  "i-lucide-clock-3",
  "i-lucide-gamepad-2",
  "i-lucide-layout-dashboard",
  "i-lucide-library",
  "i-lucide-shuffle",
  "i-lucide-pin",
  "i-lucide-layout-grid",
  "i-lucide-settings-2",
  "i-lucide-user-round",
  "i-lucide-refresh-cw",
  "i-lucide-external-link"
],
      },
    }),
  ],
});
