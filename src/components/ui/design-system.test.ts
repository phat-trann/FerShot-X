import ts from "typescript";
import { expect, it } from "vitest";

it("keeps direct platform controls inside shared library primitives", () => {
  const violations: string[] = [];
  const files = import.meta.glob<string>(["/src/**/*.tsx", "!/src/**/*.test.tsx", "!/src/components/ui/**"], { query: "?raw", import: "default", eager: true });
  expect(Object.keys(files).length).toBeGreaterThan(40);
  for (const [file, source] of Object.entries(files)) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ["button", "input", "select", "textarea", "progress", "legend"].includes(node.tagName.getText(tree))) {
        violations.push(`${file}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`);
      }
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === "Button") {
        const attributes = node.openingElement.attributes.properties;
        const plain = attributes.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === "variant" && attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === "plain");
        const hasIcon = attributes.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === "icon") || node.children.some(child => ts.isJsxSelfClosingElement(child) && /^[A-Z]/.test(child.tagName.getText(tree)));
        // Reference-matched Resize presets/apply are deliberately text-only.
        const resizePanel=file==="/src/components/EditorImageStatus.tsx";
        if (!plain && !hasIcon && !resizePanel) violations.push(`${file}: action without leading icon`);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  expect(violations).toEqual([]);
});

it("prevents legacy feature CSS from restoring accent hover borders on ordinary buttons", async () => {
  const {default:postcss}=await import("postcss");
  const files=import.meta.glob<string>(["/src/features/**/*.css"],{query:"?raw",import:"default",eager:true});
  const violations:string[]=[];
  for(const [file,source] of Object.entries(files))postcss.parse(source).walkRules(rule=>{
    if(!/button/.test(rule.selector)||!/:hover/.test(rule.selector))return;
    rule.walkDecls(/^border(?:-color)?$/,decl=>{if(/var\(--(?:fershot-)?accent[,)]/.test(decl.value))violations.push(`${file}: ${rule.selector}`);});
  });
  expect(violations).toEqual([]);
});
