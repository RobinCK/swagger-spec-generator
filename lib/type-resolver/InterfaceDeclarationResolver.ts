import * as ts from 'typescript';
import {Context} from '../Context';
import {ObjectType, ObjectProperty, BaseType, Resolver} from '../model';
import {symbolAtNode, assertDefined} from '../utils';

export class InterfaceDeclarationResolver extends Resolver {
    public isSupport(node: ts.InterfaceDeclaration): boolean {
        return node.kind === ts.SyntaxKind.InterfaceDeclaration;
    }

    public resolve(node: ts.InterfaceDeclaration, context: Context): BaseType {
        if (node.typeParameters && node.typeParameters.length) {
            node.typeParameters.forEach((typeParam) => {
                const nameSymbol = assertDefined(this.typeChecker.getSymbolAtLocation(typeParam.name));
                context.pushParameter(nameSymbol.name);
            });
        }

        return new ObjectType(
            this.getTypeId(node, context),
            this.getBaseTypes(node, context),
            this.getProperties(node, context),
            this.getAdditionalProperties(node, context),
        );
    }

    private getBaseTypes(node: ts.InterfaceDeclaration, context: Context): BaseType[] {
        if (!node.heritageClauses) {
            return [];
        }

        return node.heritageClauses.reduce((result: BaseType[], baseType) => [
            ...result,
            ...baseType.types.map((expression) => this.resolver.resolve(expression, context)),
        ], []);
    }

    private getProperties(node: ts.InterfaceDeclaration, context: Context): ObjectProperty[] {
        return node.members
            .filter(ts.isPropertySignature)
            .reduce((result: ObjectProperty[], propertyNode) => {
                const propertyType = assertDefined(propertyNode.type);
                const propertySymbol = assertDefined(symbolAtNode(propertyNode));

                const objectProperty = new ObjectProperty(
                    propertySymbol.getName(),
                    this.resolver.resolve(propertyType, context),
                    !propertyNode.questionToken,
                );

                result.push(objectProperty);

                return result;
            }, []);
    }

    private getAdditionalProperties(node: ts.InterfaceDeclaration, context: Context): BaseType | undefined {
        const indexSignature = node.members.find(ts.isIndexSignatureDeclaration);

        if (!indexSignature) {
            return undefined;
        }

        const indexType = assertDefined(indexSignature.type);

        return this.resolver.resolve(indexType, context);
    }

    private getTypeId(node: ts.Node, context: Context): string {
        const fullName = `interface-${node.getFullStart()}`;
        const argumentIds = context.getArguments().map((arg) => arg.getId());

        return argumentIds.length ? `${fullName}<${argumentIds.join(',')}>` : fullName;
    }
}
