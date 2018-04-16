import {
  chain,
  externalSchematic,
  Rule,
  move,
  Tree,
  SchematicContext
} from '@angular-devkit/schematics';

import { addImportToModule } from '@schematics/angular/utility/ast-utils';

import * as path from 'path';
import * as ts from 'typescript';
import { InsertChange } from '@schematics/angular/utility/change';

export default function(schema: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    const cliConfig = JSON.parse(host.read('.angular-cli.json').toString());
    const appConfig = schema.app
      ? cliConfig.apps.find(app => app.name === schema.app)
      : cliConfig.apps[0];

    const fullPath = path.join(appConfig.root, schema.name);

    return chain([
      externalSchematic('@schematics/angular', 'module', {
        ...schema,
        name: schema.name,
        sourceDir: appConfig.root,
        spec: false,
        flat: false
      }),
      (host: Tree) => {
        const fullModulePath = path.join(
          appConfig.root,
          'app',
          schema.name,
          `${schema.name}.module.ts`
        );
        const contents = host.read(fullModulePath).toString();
        const sourceFile = ts.createSourceFile(
          fullModulePath,
          contents,
          ts.ScriptTarget.Latest,
          true
        );
        const changes = addImportToModule(
          sourceFile,
          fullModulePath,
          'SharedUiModule',
          '@proj/shared-ui'
        );

        const recorder = host.beginUpdate(fullModulePath);
        changes.forEach((insertChange: InsertChange) => {
          recorder.insertLeft(insertChange.pos, insertChange.toAdd);
        });
        host.commitUpdate(recorder);
        return host;
      }
    ])(host, context);
  };
}
