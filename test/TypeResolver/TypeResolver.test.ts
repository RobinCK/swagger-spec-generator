import * as glob from 'glob';
import * as path from 'path';
import * as minimatch from 'minimatch';
import * as fs from 'fs';
import * as ts from 'typescript';
import {describe} from 'mocha';
import {values} from 'lodash';
import * as kindResolvers from '../../lib/kind';
import {TypeResolver} from '../../lib/TypeResolver';

const assert = require('chai').assert;
const isTested: string[] = [];
const nodes: ts.TypeNode[] = [];
const compilerOptions = require(path.join(process.cwd(), 'tsconfig.json'));
const testFoldersPattern = path.join(process.cwd(), 'test/TypeResolver/resources/*');
const program = ts.createProgram(
    glob.sync(testFoldersPattern)
        .map((testPath) => path.join(testPath, 'main'))
    ,
    compilerOptions || {}
);
const typeChecker = program.getTypeChecker();

program.getSourceFiles()
    .filter((sourceFile) => minimatch(sourceFile.fileName, `${testFoldersPattern}*`))
    .forEach((sourceFile) => {
        ts.forEachChild(sourceFile, (n: ts.TypeNode) => {
            nodes.push(n);
        });
    })
;

const typeResolver = new TypeResolver(nodes, typeChecker);

for (const resolver of values(kindResolvers)) {
    typeResolver.register(resolver);
}

// const node = nodes.filter(n => n.kind !== ts.SyntaxKind.EndOfFileToken).shift();
//

describe('type-resolver', () => {
    nodes
        .filter(n => n.kind !== ts.SyntaxKind.EndOfFileToken)
        .forEach((node: ts.TypeNode) => {
            const testFilePath = node.getSourceFile().fileName;
            const testFolder = path.basename(path.dirname(node.getSourceFile().fileName))

            if (isTested.indexOf(testFilePath) === -1) {
                isTested.push(testFilePath);

                it(testFolder, () => {
                    const schema = JSON.parse(
                        fs.readFileSync(
                            path.join(process.cwd(),
                                'test/TypeResolver/resources',
                                path.basename(testFolder),
                                'schema.json'
                            )
                        ).toString()
                    );

                    const resolvedSchema = typeResolver.resolve(node);

                    assert.deepEqual(resolvedSchema, schema);
                });
            }
        });
});