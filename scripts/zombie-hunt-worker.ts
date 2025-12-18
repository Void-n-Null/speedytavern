import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import ts from 'typescript';

type FileData = {
  filePath: string;
  imports: { path: string; symbols: string[] }[];
  exports: string[];
};

function parseFile(filePath: string): FileData {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const imports: { path: string; symbols: string[] }[] = [];
  const exports: string[] = [];

  function visit(node: ts.Node) {
    // Static Imports: import { foo } from './bar'
    if (ts.isImportDeclaration(node)) {
      const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
      const symbols: string[] = [];
      if (node.importClause) {
        if (node.importClause.name) {
          symbols.push('default');
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach((specifier) => {
              symbols.push(specifier.name.text);
            });
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            symbols.push('*');
          }
        }
      }
      imports.push({ path: importPath, symbols });
    }

    // Dynamic imports: import('./foo')
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        imports.push({ path: arg.text, symbols: ['*'] });
      }
    }

    // Re-exports: export { foo } from './bar'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      const symbols: string[] = [];
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((specifier) => {
          symbols.push(specifier.name.text);
        });
      } else {
        symbols.push('*');
      }
      imports.push({ path: importPath, symbols });
    }

    // Standard Exports: export const foo = ...
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          exports.push(decl.name.text);
        }
      });
    }

    // Named Exports: export function foo() ...
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (node.name) {
        if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
          exports.push('default');
        } else {
          exports.push(node.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return { filePath, imports, exports };
}

const results = workerData.chunk.map((f: string) => {
  try {
    return parseFile(f);
  } catch (err) {
    console.error(`Error parsing ${f}:`, err);
    return { filePath: f, imports: [], exports: [] };
  }
});
parentPort?.postMessage(results);
