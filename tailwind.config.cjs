module.exports = {
 content: ["./index.html", "./src/**/*.{ts,tsx}"],
 corePlugins: { preflight: false },
 theme: { extend: { colors: {
  border: "hsl(var(--ui-border))", input: "hsl(var(--ui-border))", ring: "hsl(var(--ui-ring))", background: "hsl(var(--ui-background))", foreground: "hsl(var(--ui-foreground))",
  primary: { DEFAULT: "hsl(var(--ui-primary))", foreground: "hsl(var(--ui-primary-foreground))" }, secondary: { DEFAULT: "hsl(var(--ui-secondary))", foreground: "hsl(var(--ui-foreground))" }, accent: { DEFAULT: "hsl(var(--ui-accent))", foreground: "hsl(var(--ui-foreground))" }, muted: { DEFAULT: "hsl(var(--ui-secondary))", foreground: "hsl(var(--ui-muted-foreground))" }, destructive: { DEFAULT: "#d73545", foreground: "white" }
 } } }, plugins: []
};
